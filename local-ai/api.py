"""
api.py - headless local AI API (FastAPI, CORS open) for The Amazing Simulation.

Runs on http://127.0.0.1:8000 (change with LOCAL_AI_HOST / LOCAL_AI_PORT).

  POST /            simple call: prompt (+ optional image, audio, use_web_search) -> {"text": ...}
  POST /generate    same as POST /
                    accepts JSON  {"prompt", "image": base64|dataURL, "audio": base64|dataURL, "use_web_search": bool,
                                   "system", "max_tokens", "temperature"}
                    or multipart form fields with the same names (image / audio as file uploads)
  POST /v1/messages Anthropic Messages-compatible endpoint (messages, tools, tool_use / tool_result, images):
                    what the website calls, so its request and response structure stay exactly the same.
                    Extra optional field: "use_web_search": bool
  GET  /health      status: hardware, chosen models, loaded or not, adapter in use
  POST /unload      free all GPU/RAM now (it also happens by itself after 5 idle minutes)
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
# plain HTTPS model downloads (the newer "xet" transfer can stall on some networks); no symlink nag on Windows
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "0")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from engine import get_engine

HOST = os.environ.get("LOCAL_AI_HOST", "127.0.0.1")
PORT = int(os.environ.get("LOCAL_AI_PORT", "8000"))

app = FastAPI(title="The Amazing Simulation - local AI", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], max_age=86400)


@app.middleware("http")
async def private_network_access(request: Request, call_next):
    """Lets the website (served from Vercel over https) reach this server on 127.0.0.1 in Chromium browsers."""
    resp = await call_next(request)
    resp.headers["Access-Control-Allow-Private-Network"] = "true"
    resp.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return resp


def _err(status: int, code: str, message: str):
    return JSONResponse({"type": "error", "error": {"type": code, "code": code, "message": message}}, status_code=status)


def _truthy(v) -> bool:
    return v is True or str(v).strip().lower() in ("1", "true", "yes", "on")


@app.get("/")
@app.get("/health")
async def health():
    return {"ok": True, **get_engine().status()}


@app.post("/unload")
async def unload():
    await run_in_threadpool(get_engine().unload)
    return {"ok": True, "loaded": False}


@app.post("/")
@app.post("/generate")
async def generate(request: Request):
    ctype = request.headers.get("content-type", "")
    image = audio = None
    try:
        if "multipart/form-data" in ctype or "application/x-www-form-urlencoded" in ctype:
            form = await request.form()
            data = {k: v for k, v in form.items() if isinstance(v, str)}
            if "image" in form and not isinstance(form["image"], str):
                image = await form["image"].read()
            if "audio" in form and not isinstance(form["audio"], str):
                audio = await form["audio"].read()
            image = image or data.get("image") or None
            audio = audio or data.get("audio") or None
        else:
            data = await request.json()
            image = data.get("image") or None
            audio = data.get("audio") or None
    except Exception as e:
        return _err(400, "invalid_request", f"could not read the request: {e}")
    prompt = str(data.get("prompt") or "").strip()
    if not prompt and image is None and audio is None:
        return _err(400, "invalid_request", "send at least a prompt, an image or an audio clip")
    try:
        out = await run_in_threadpool(
            get_engine().complete, prompt, image, audio, _truthy(data.get("use_web_search")), data.get("system"),
            int(data.get("max_tokens") or 1024), float(data.get("temperature") if data.get("temperature") is not None else 0.6))
        return out
    except Exception as e:
        return _err(500, "api_error", f"{type(e).__name__}: {e}")


@app.post("/hear")
async def hear(request: Request):
    """The local AI listens to audio: {"audio": base64|dataURL, "context"?} or multipart (audio file)
    -> {"transcript", "language", "emotion", "tone", "energy", "voice", "sounds", "summary", "heard_directly", "model"}"""
    ctype = request.headers.get("content-type", "")
    try:
        if "multipart/form-data" in ctype:
            form = await request.form()
            a = form.get("audio")
            audio = await a.read() if a is not None and not isinstance(a, str) else a
            context = form.get("context") if isinstance(form.get("context"), str) else None
        else:
            data = await request.json()
            audio, context = data.get("audio"), data.get("context")
    except Exception as e:
        return _err(400, "invalid_request", f"could not read the request: {e}")
    if not audio:
        return _err(400, "invalid_request", "audio is required")
    try:
        return await run_in_threadpool(get_engine().hear, audio, context)
    except Exception as e:
        return _err(500, "api_error", f"{type(e).__name__}: {e}")


@app.post("/v1/messages")
async def messages(request: Request):
    try:
        body = await request.json()
    except Exception:
        return _err(400, "invalid_request_error", "invalid JSON body")
    if not isinstance(body.get("messages"), list) or not body["messages"]:
        return _err(400, "invalid_request_error", "messages array is required")
    try:
        return await run_in_threadpool(get_engine().messages, body)
    except Exception as e:
        msg = str(e)
        if "out of memory" in msg.lower():
            return _err(529, "overloaded_error", "the local GPU ran out of memory for this request; try a smaller one")
        return _err(500, "api_error", f"{type(e).__name__}: {msg}")


if __name__ == "__main__":
    import uvicorn
    get_engine()  # print the hardware + model plan at start (models themselves load on the first request)
    if _truthy(os.environ.get("LOCAL_AI_PRELOAD", "")):
        asyncio.run(run_in_threadpool(get_engine().ensure_loaded))
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
