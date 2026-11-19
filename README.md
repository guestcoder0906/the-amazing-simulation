# The Amazing Simulation

Interactive 3D world and character sandbox powered by Claude.

## Deploy on Vercel (no server needed)

1. Import this repository in Vercel. Framework preset: **Vite** (build `npm run build`, output `dist`).
2. Optional: add an environment variable `CLAUDE_API_KEY` so visitors can use
   "Continue without custom key (limits apply)". It is used only by the serverless
   function `api/claude.ts` and is never exposed to the browser. The site adds no usage caps of its own:
   only your Anthropic account's credits and rate limits apply (brief 429/529 replies are retried automatically).
   Optional per-visitor caps: set `SHARED_LIMIT_PER_10MIN` and/or `SHARED_LIMIT_PER_DAY`.
3. Visitors can also paste their own Claude API key (stored only in their browser),
   which calls the Claude API directly. Keys: https://platform.claude.com/settings/keys

## Voices

Characters speak and sing with natural, human-quality voices generated entirely in the visitor's browser
(Kokoro-82M via kokoro-js, in a Web Worker; WebGPU when available, otherwise WebAssembly). The model (~90 MB)
downloads once when voices are switched on and is then cached. Each character gets its own matched voice, pitch and pace.
Devices that can't run it smoothly automatically use the best browser voices instead. No server is involved.
`vercel.json` sends cross-origin isolation headers (COOP same-origin + COEP credentialless) so the model can use
all CPU cores on devices without WebGPU.

## Run locally

```
npm install
npm run dev
```

Put `CLAUDE_API_KEY=...` in `.env.local` to test the shared-key mode.
