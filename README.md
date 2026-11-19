# The Amazing Simulation

Interactive 3D world and character sandbox powered by Claude.

## Deploy on Vercel (no server needed)

1. Import this repository in Vercel. Framework preset: **Vite** (build `npm run build`, output `dist`).
2. Optional: add an environment variable `CLAUDE_API_KEY` so visitors can use
   "Continue without custom key (limits apply)". It is used only by the serverless
   function `api/claude.ts` and is never exposed to the browser.
3. Visitors can also paste their own Claude API key (stored only in their browser),
   which calls the Claude API directly. Keys: https://platform.claude.com/settings/keys

## Run locally

```
npm install
npm run dev
```

Put `CLAUDE_API_KEY=...` in `.env.local` to test the shared-key mode.
