import { defineConfig, loadEnv } from 'vite';

// Static site build. The only backend piece is api/claude.ts, which Vercel runs as a
// serverless function (no server to host). In `npm run dev` the same handler is mounted
// as Vite middleware so /api/claude works locally too, reading CLAUDE_API_KEY from .env.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY) process.env.CLAUDE_API_KEY = env.CLAUDE_API_KEY;
  return {
    plugins: [
      {
        name: 'local-api-claude',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use('/api/claude', async (req, res) => {
            const mod = await server.ssrLoadModule('/api/claude.ts');
            const r = res as typeof res & { status: (c: number) => typeof r; json: (b: unknown) => typeof r; send: (b: unknown) => typeof r };
            r.status = (c: number) => { res.statusCode = c; return r; };
            r.json = (b: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return r; };
            r.send = (b: unknown) => { res.end(typeof b === 'string' ? b : JSON.stringify(b)); return r; };
            await mod.default(req, r);
          });
        },
      },
    ],
  };
});
