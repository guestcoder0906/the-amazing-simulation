import type { IncomingMessage, ServerResponse } from 'node:http';

// Vercel serverless function: the game's quick tasks (talking, moving, looking, reactions) and all audio listening go to
// Google's Gemini 3.5 Flash-Lite with minimal thinking, using the GEMINI_API_KEY env variable (never sent to the browser).
// It speaks the same Messages format as /api/claude (messages, tools, tool_use / tool_result, images, audio), converting
// to and from Gemini's format here, so the game code does not change.

type Req = IncomingMessage & { body?: unknown };
type Res = ServerResponse & { status: (c: number) => Res; json: (b: unknown) => Res; send: (b: unknown) => Res };

const MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type Block = { type: string; [k: string]: any };
type Msg = { role: string; content: string | Block[] };

function readJson(req: Req): Promise<any> {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string' && req.body.trim()) return Promise.resolve(JSON.parse(req.body));
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => { try { const s = Buffer.concat(chunks).toString('utf8'); resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function toGemini(body: any) {
  const names: Record<string, string> = {}; // tool_use id -> tool name (Gemini answers function results by name)
  const contents: any[] = [];
  for (const m of (body.messages || []) as Msg[]) {
    const blocks: Block[] = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content || [];
    const parts: any[] = [];
    for (const b of blocks) {
      if (b.type === 'text') { if (String(b.text || '').trim()) parts.push({ text: b.text }); }
      else if (b.type === 'image' && b.source?.data) parts.push({ inlineData: { mimeType: b.source.media_type || 'image/jpeg', data: b.source.data } });
      else if (b.type === 'audio' && b.source?.data) parts.push({ inlineData: { mimeType: b.source.media_type || 'audio/wav', data: b.source.data } });
      else if (b.type === 'tool_use') {
        names[b.id] = b.name;
        const p: any = { functionCall: { name: b.name, args: b.input || {} } };
        if (b._gsig) p.thoughtSignature = b._gsig; // Gemini needs its own signature back on replayed calls
        parts.push(p);
      } else if (b.type === 'tool_result') {
        const c = Array.isArray(b.content) ? b.content.map((x: any) => x.text || '').join('\n') : String(b.content ?? '');
        parts.push({ functionResponse: { name: names[b.tool_use_id] || 'tool', response: { result: c } } });
      }
      // thinking blocks (Claude only) and other block types are skipped
    }
    if (!parts.length) parts.push({ text: '(continue)' });
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts); else contents.push({ role, parts });
  }
  const sys = Array.isArray(body.system) ? body.system.map((x: any) => x.text || '').join('\n') : body.system;
  const req: any = {
    contents,
    generationConfig: { maxOutputTokens: Math.min(Number(body.max_tokens) || 4096, 8192), thinkingConfig: { thinkingLevel: 'minimal' } },
  };
  if (sys) req.systemInstruction = { parts: [{ text: String(sys) }] };
  const tools = (body.tools || []).filter((t: any) => t && t.name && !t.type);
  if (tools.length) {
    req.tools = [{ functionDeclarations: tools.map((t: any) => ({ name: t.name, description: String(t.description || ''), parametersJsonSchema: t.input_schema || { type: 'object', properties: {} } })) }];
    req.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
  }
  return req;
}

function fromGemini(g: any) {
  const cand = (g.candidates || [])[0] || {};
  const content: Block[] = [];
  let calls = 0;
  for (const p of cand.content?.parts || []) {
    if (p.thought) continue;
    if (typeof p.text === 'string' && p.text) content.push({ type: 'text', text: p.text });
    else if (p.functionCall) {
      calls++;
      const b: Block = { type: 'tool_use', id: 'toolu_g' + Math.random().toString(36).slice(2, 14), name: p.functionCall.name, input: p.functionCall.args || {} };
      if (p.thoughtSignature) b._gsig = p.thoughtSignature;
      content.push(b);
    }
  }
  if (!content.length) content.push({ type: 'text', text: '' });
  const u = g.usageMetadata || {};
  return {
    id: 'msg_g' + Math.random().toString(36).slice(2, 14), type: 'message', role: 'assistant', model: MODEL, content,
    stop_reason: calls ? 'tool_use' : cand.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn', stop_sequence: null,
    usage: { input_tokens: u.promptTokenCount || 0, output_tokens: u.candidatesTokenCount || 0 },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (req.method === 'GET') return res.status(200).json({ configured: Boolean(key), model: MODEL });
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Use POST' } });
  if (!key) return res.status(503).json({ error: { code: 'not_granted', message: 'GEMINI_API_KEY is not set on this deployment.' } });
  let body: any;
  try { body = await readJson(req); } catch { return res.status(400).json({ error: { code: 'invalid_request', message: 'Invalid JSON body' } }); }
  if (!Array.isArray(body.messages) || !body.messages.length) return res.status(400).json({ error: { code: 'invalid_request', message: 'messages array is required' } });
  const payload = JSON.stringify(toGemini(body));
  try {
    const started = Date.now();
    let up = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: payload });
    for (let a = 0; a < 3 && (up.status === 429 || up.status === 503 || up.status === 500); a++) {
      const wait = 1200 * 2 ** a;
      if (Date.now() - started + wait > 40000) break;
      await sleep(wait);
      up = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: payload });
    }
    const text = await up.text();
    if (!up.ok) {
      let message = text.slice(0, 400);
      try { message = JSON.parse(text).error.message || message; } catch { /* ok */ }
      return res.status(up.status === 429 ? 429 : up.status >= 500 ? 529 : up.status).json({ error: { code: up.status === 429 ? 'rate_limited' : 'api_error', message: 'Gemini: ' + message } });
    }
    return res.status(200).json(fromGemini(JSON.parse(text)));
  } catch (e) {
    return res.status(502).json({ error: { code: 'api_error', message: 'Failed to reach Gemini: ' + (e instanceof Error ? e.message : String(e)) } });
  }
}
