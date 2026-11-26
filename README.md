# The Amazing Simulation

Interactive 3D world and character sandbox powered by your own local, custom-trainable AI.

## AI

The game uses **Claude** and **Gemini** through two Vercel serverless functions (no server to run):

| Work | Model | Key (Vercel → Settings → Environment Variables) |
|---|---|---|
| Building, 3D modeling, coding, the builder's checks | Claude Opus 5.5 (low effort) | `CLAUDE_API_KEY` |
| Quick tasks: talking, moving, looking, reactions | Gemini 3.5 Flash-Lite (minimal thinking) | `GEMINI_API_KEY` |
| Listening: voice chat and live in-game sound | Gemini 3.5 Flash-Lite (minimal thinking) | `GEMINI_API_KEY` |
| Yes/no questions | Gemini Decision 1 | `GEMINI_API_KEY` |

Fallbacks (each step is tried until one answers):

- **Big work:** Opus 5.5 → Haiku 5.5 → Gemini 4 Hydrogen (medium) → Gemini 3.8 Flash (medium) → Gemini 3.5 Flash-Lite (medium) → local AI
- **Quick work:** Gemini 3.5 Flash-Lite (minimal) → Haiku 5.5 → local AI
- **Haiku:** Haiku 5.5 → Gemini 3.5 Flash-Lite (minimal) → local AI
- **Yes/no:** Gemini Decision 1 → Gemini 3.5 Flash-Lite (minimal) → Haiku 5.5 → local AI

Without `GEMINI_API_KEY`, quick tasks fall back to Claude Haiku 5.5 and listening is off.
Visitors can also use their own Claude API key: the key button (bottom left) → **Connect to Claude** opens their API keys
page, then **Paste key**. The key stays in their browser and calls Claude directly. If the site's Claude key is missing or
busy, the game asks for a key automatically.

The custom local AI below is switched off. Open the site with `?provider=local` to use it again (`?provider=claude` to switch back).

## Local AI (switched off for now; runs on your computer)

All AI features (the builder, Smart Ollo / Caine, character minds, singing) call a headless local API at
`http://127.0.0.1:8000`, found in [`local-ai/`](local-ai). Nothing is sent to an outside AI service.

```
start.bat        (Windows)      or   ./start.sh   (Mac / Linux)
stop.bat                        or   ./stop.sh
```

The first start creates a Python environment (Windows: `%LOCALAPPDATA%\AmazingSimAI\venv`, a short path so Windows' path-length limit never breaks installs; Mac/Linux: `local-ai/.venv`) and installs everything (PyTorch for CUDA 12.8 on NVIDIA, MLX on Apple Silicon),
which takes a while. Models download on the first AI request and load into the GPU at 4-bit or 8-bit:

| GPU memory | Models |
|---|---|
| 16 GB+ | `google/gemma-3-12b-it` + `faster-whisper large-v3-turbo`; `Qwen/Qwen2.5-Coder-14B-Instruct` for pure coding when it also fits |
| 8-12 GB | `Qwen/Qwen2.5-Omni-7B` (4-bit): audio, images, reasoning and code in one model |
| under 8 GB | `google/gemma-3n-E4B-it` (4-bit) |

Everything is unloaded (GPU and RAM freed) after 5 idle minutes and reloads on the next request.
Gemma models are gated on Hugging Face: run `huggingface-cli login` and accept the licence, or the engine uses the ungated
Unsloth mirrors automatically.

API (CORS open, see `local-ai/api.py`):

- `POST /` or `/generate`: `prompt`, optional `image`, optional `audio`, `use_web_search` (JSON with base64, or multipart uploads)
- `POST /v1/messages`: Messages-format endpoint with tools that the website uses (same request/response structure as before)
- `GET /health`, `POST /unload`

Live web search (DuckDuckGo, `ddgs`) is added when `use_web_search` is true; the website turns it on automatically when a
request asks to look something up.

### Custom training

Drop examples into `local-ai/data` (see [its README](local-ai/data/README.md)), then:

```
cd local-ai
%LOCALAPPDATA%\AmazingSimAI\venv\Scripts\python -m pip install -r requirements-train.txt
%LOCALAPPDATA%\AmazingSimAI\venv\Scripts\python train.py --minutes 40
(Mac/Linux: .venv/bin/python -m pip install -r requirements-train-mac.txt, then .venv/bin/python train.py)
```

The LoRA adapter is saved to `local-ai/my_adapter` and used automatically after `stop` + `start`.

### Using the deployed site with your local AI

The Vercel site calls `http://127.0.0.1:8000` from the visitor's browser, so it uses the AI running on that visitor's own
computer. Chrome may ask to allow access to devices on your local network the first time: allow it.
To point the site at another address, open it with `?ai=http://host:port` (remembered in that browser).

**Access key on every device automatically:** in Vercel, open the project → Settings → Environment Variables and add
`VITE_LOCAL_AI_KEY` with the key from `local-ai/.ai_key` (created by the first `start.bat`), then redeploy. Every device
then has the key built in. Anyone who opens your site can then use your AI while it runs; to keep it private instead, leave
the variable unset and open `local-ai/DEVICE_LINK.txt` once on each of your own devices.

## Deploy on Vercel

Import this repository in Vercel. Framework preset: **Vite** (build `npm run build`, output `dist`). No environment
variables are needed. `local-ai/` is excluded from the deployment (`.vercelignore`).

## Voices

Characters speak and sing with natural, human-quality voices generated entirely in the visitor's browser
(Kokoro-82M via kokoro-js, in a Web Worker; WebGPU when available, otherwise WebAssembly). The model (~90 MB)
downloads once when voices are switched on and is then cached. Each character gets its own matched voice, pitch and pace.
Devices that can't run it smoothly automatically use the best browser voices instead.
`vercel.json` sends cross-origin isolation headers (COOP same-origin + COEP credentialless) so the model can use
all CPU cores on devices without WebGPU.

## Play on your own computer (your Claude Code login, no API key)

Double-click **`play-local.bat`** (Windows), or run `./play-local.sh` (Mac / Linux). It needs Python 3.

- **First run:** if Claude Code is missing, it offers to install it with Anthropic's official installer. Then it opens Anthropic's sign-in page in your browser so you can sign in to your Claude account.
- **Every run:** the game opens at `http://127.0.0.1:8137/`. Close the window to stop it.

How it works:
- `local/server.py` serves the site the same way Vercel does.
- It answers the game's Claude requests through the official Claude Code app on your computer (`claude -p`), signed in with your own account. Your login stays inside Claude Code.
- Usage counts against your Claude plan.
- This is for your own use on your own computer: the deployed site cannot use your login, and it must not be shared with other people.
- Gemini is not set up locally, so the game uses Claude (Haiku) for its quick checks and listens in the browser.

## Run the website locally (development)

```
npm install
npm run dev
```
