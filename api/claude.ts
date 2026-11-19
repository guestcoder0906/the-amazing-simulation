import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
  headers: IncomingMessage['headers'];
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
  send: (body: unknown) => VercelResponse;
};

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQ_PER_WINDOW = 15;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQ_PER_DAY = 60;
const SHARED_MAX_TOKENS = 4096;

const rateBuckets = new Map<string, { short: number[]; daily: number[] }>();

function getClientKey(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff || req.socket?.remoteAddress || 'unknown';
  return String(raw).split(',')[0].trim() || 'unknown';
}

function checkRateLimit(ip: string): { ok: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket) {
    bucket = { short: [], daily: [] };
    rateBuckets.set(ip, bucket);
  }
  bucket.short = bucket.short.filter((t) => now - t < WINDOW_MS);
  bucket.daily = bucket.daily.filter((t) => now - t < DAILY_WINDOW_MS);

  if (bucket.short.length >= MAX_REQ_PER_WINDOW) {
    const oldest = bucket.short[0];
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) };
  }
  if (bucket.daily.length >= MAX_REQ_PER_DAY) {
    const oldest = bucket.daily[0];
    return { ok: false, remaining: 0, retryAfterSec: Math.max(60, Math.ceil((DAILY_WINDOW_MS - (now - oldest)) / 1000)) };
  }

  bucket.short.push(now);
  bucket.daily.push(now);

  if (rateBuckets.size > 2000) {
    for (const [k, b] of rateBuckets) {
      if (!b.daily.some((t) => now - t < DAILY_WINDOW_MS)) rateBuckets.delete(k);
    }
  }

  return {
    ok: true,
    remaining: Math.min(MAX_REQ_PER_WINDOW - bucket.short.length, MAX_REQ_PER_DAY - bucket.daily.length),
  };
}

function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body as Record<string, unknown>);
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return Promise.resolve(JSON.parse(req.body) as Record<string, unknown>);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function fallbackModel(model: string): string | null {
  if (/opus/i.test(model)) return 'claude-opus-4-20250514';
  if (/haiku/i.test(model)) return 'claude-3-5-haiku-latest';
  if (/sonnet/i.test(model)) return 'claude-sonnet-4-20250514';
  return 'claude-sonnet-4-20250514';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const apiKey = (process.env.CLAUDE_API_KEY || '').trim();

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(apiKey),
      limits: { per10Min: MAX_REQ_PER_WINDOW, perDay: MAX_REQ_PER_DAY, maxTokens: SHARED_MAX_TOKENS },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Use POST' } });
  }

  if (!apiKey) {
    return res.status(503).json({
      error: {
        code: 'not_granted',
        message: 'Shared CLAUDE_API_KEY is not configured on this deployment. Enter your own Claude API key for unlimited usage.',
      },
    });
  }

  const ip = getClientKey(req);
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec || 60));
    return res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Shared usage limit reached. Wait a little while or enter your own Claude API key for unlimited usage.',
        retry_after: limit.retryAfterSec,
      },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: { code: 'invalid_request', message: 'Invalid JSON body' } });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: { code: 'invalid_request', message: 'messages array is required' } });
  }

  const reqModel = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'claude-sonnet-4-20250514';
  const payload: Record<string, unknown> = {
    model: reqModel,
    max_tokens: Math.min(Number(body.max_tokens) || SHARED_MAX_TOKENS, SHARED_MAX_TOKENS),
    messages: body.messages,
  };
  if (Array.isArray(body.tools) && body.tools.length) payload.tools = body.tools;
  if (typeof body.system === 'string' || Array.isArray(body.system)) payload.system = body.system;
  if (typeof body.temperature === 'number') payload.temperature = body.temperature;
  if (body.tool_choice && typeof body.tool_choice === 'object') payload.tool_choice = body.tool_choice;

  const forward = async (p: Record<string, unknown>) =>
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(p),
    });

  try {
    let upstream = await forward(payload);
    if (upstream.status === 404) {
      const fb = fallbackModel(reqModel);
      if (fb && fb !== reqModel) {
        upstream = await forward({ ...payload, model: fb });
      }
    }

    const text = await upstream.text();
    res.setHeader('X-Shared-Limit-Remaining', String(limit.remaining));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(502).json({
      error: {
        code: 'api_error',
        message: 'Failed to reach Claude API: ' + (err instanceof Error ? err.message : String(err)),
      },
    });
  }
}
