# The Amazing Simulation

Interactive 3D world and character sandbox powered by your own local, custom-trainable AI.

## Local AI (runs on your computer)

All AI features (the builder, Smart Ollo / Caine, character minds, singing) call a headless local API at
`http://127.0.0.1:8000`, found in [`local-ai/`](local-ai). Nothing is sent to an outside AI service.

```
start.bat        (Windows)      or   ./start.sh   (Mac / Linux)
stop.bat                        or   ./stop.sh
```

The first start creates `local-ai/.venv` and installs everything (PyTorch for CUDA 12.8 on NVIDIA, MLX on Apple Silicon),
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
.venv\Scripts\python -m pip install -r requirements-train.txt      (Mac: .venv/bin/python -m pip install -r requirements-train-mac.txt)
.venv\Scripts\python train.py --minutes 40
```

The LoRA adapter is saved to `local-ai/my_adapter` and used automatically after `stop` + `start`.

### Using the deployed site with your local AI

The Vercel site calls `http://127.0.0.1:8000` from the visitor's browser, so it uses the AI running on that visitor's own
computer. Chrome may ask to allow access to devices on your local network the first time: allow it.
To point the site at another address, open it with `?ai=http://host:port` (remembered in that browser).

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

## Run the website locally

```
npm install
npm run dev
```
