"""
llama_backend.py - runs the model with llama.cpp's llama-server (much faster than Python transformers for long prompts).

Why: the game's builder sends ~20-25k-token prompts. llama.cpp reads them many times faster (fused GPU kernels, flash
attention), stores the attention cache compactly (8-bit) so a 32k-token context fits next to the model on an 8 GB GPU,
and keeps the processed prompt between requests (prompt caching): when the next step re-sends the same instructions,
only the new part is processed. Same model (Qwen2.5-Omni-7B) with text, images and audio.
"""
from __future__ import annotations

import base64
import io
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from setup_llama import MODEL_DIR, server_path, vram_gb


def log(*a):
    print("[llama]", *a, file=sys.stderr, flush=True)


def available() -> bool:
    if os.environ.get("LOCAL_AI_BACKEND", "").lower() == "transformers":
        return False
    meta = MODEL_DIR / "active.json"
    if not server_path() or not meta.exists():
        return False
    m = json.loads(meta.read_text())
    return (MODEL_DIR / m["model"]).exists() and (MODEL_DIR / m["mmproj"]).exists()


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class LlamaServer:
    def __init__(self):
        self.proc: subprocess.Popen | None = None
        self.port = 0
        self.ctx = 0
        self.model_name = ""

    def start(self):
        meta = json.loads((MODEL_DIR / "active.json").read_text())
        self.model_name = meta["model"].replace(".gguf", "")
        vram = vram_gb()
        # biggest context that fits: 32k tokens on 8 GB with an 8-bit cache, more on bigger cards
        contexts = [int(os.environ["LOCAL_AI_CTX"])] if os.environ.get("LOCAL_AI_CTX") else (
            [65536, 32768] if vram >= 20 else [32768, 24576] if vram >= 10 else [32768, 24576, 16384])
        last_err = ""
        for ctx in contexts:
            self.port = _free_port()
            args = [str(server_path()), "-m", str(MODEL_DIR / meta["model"]), "--mmproj", str(MODEL_DIR / meta["mmproj"]),
                    "--host", "127.0.0.1", "--port", str(self.port), "-c", str(ctx), "-ngl", "999",
                    "--flash-attn", "on", "--cache-type-k", "q8_0", "--cache-type-v", "q8_0",
                    "-b", "2048", "-ub", "512", "--parallel", "1", "--no-webui"]
            if 0 < vram < 10:
                args.append("--no-mmproj-offload")  # image/audio encoder on the CPU: leaves the GPU for the model + long context
            log(f"starting llama-server (context {ctx} tokens)...")
            logf = open(Path(__file__).resolve().parent / "llama_server.log", "w", encoding="utf-8", errors="replace")
            flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            self.proc = subprocess.Popen(args, stdout=logf, stderr=subprocess.STDOUT, creationflags=flags)
            t0 = time.time()
            while time.time() - t0 < 300:
                if self.proc.poll() is not None:
                    break
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/health", timeout=2) as r:
                        if r.status == 200:
                            self.ctx = ctx
                            log(f"ready: context {ctx} tokens, {time.time() - t0:.0f}s")
                            return
                except Exception:
                    pass
                time.sleep(0.5)
            last_err = (Path(__file__).resolve().parent / "llama_server.log").read_text(errors="replace")[-600:]
            self.stop()
            log(f"context {ctx} did not fit, trying smaller. Last log: {last_err[-200:]}")
        raise RuntimeError("llama-server could not start: " + last_err)

    def stop(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(10)
            except Exception:
                self.proc.kill()
        self.proc = None

    def chat(self, system: str, msgs: list[dict], max_tokens: int, temperature: float) -> tuple[str, int, int, bool]:
        """msgs: engine format [{'role', 'content': [{'type': 'text'|'image'|'audio', ...}]}]."""
        out = []
        if system:
            out.append({"role": "system", "content": system})
        for m in msgs:
            parts = []
            for c in m["content"]:
                if c["type"] == "text":
                    parts.append({"type": "text", "text": c.get("text", "")})
                elif c["type"] == "image":
                    buf = io.BytesIO()
                    c["image"].save(buf, format="JPEG", quality=90)
                    parts.append({"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()}})
                elif c["type"] == "audio":
                    import soundfile as sf
                    buf = io.BytesIO()
                    sf.write(buf, c["audio"], 16000, format="WAV")
                    parts.append({"type": "input_audio", "input_audio": {"data": base64.b64encode(buf.getvalue()).decode(), "format": "wav"}})
            if m["role"] == "assistant":
                out.append({"role": "assistant", "content": "\n".join(p["text"] for p in parts if p["type"] == "text")})
            else:
                out.append({"role": "user", "content": parts if any(p["type"] != "text" for p in parts) else "\n".join(p["text"] for p in parts)})
        body = {"messages": out, "max_tokens": max_tokens, "temperature": temperature, "top_p": 0.9, "repeat_penalty": 1.05,
                "cache_prompt": True, "stream": False}
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}/v1/chat/completions", data=json.dumps(body).encode(),
                                     headers={"content-type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=1800) as r:
                res = json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"llama-server {e.code}: {e.read().decode(errors='replace')[:400]}")
        ch = res["choices"][0]
        u = res.get("usage", {})
        tm = res.get("timings", {})
        if tm:
            log(f"prompt {u.get('prompt_tokens')} tok ({tm.get('prompt_per_second', 0):.0f}/s, {tm.get('cache_n', 0)} reused from cache), "
                f"reply {u.get('completion_tokens')} tok ({tm.get('predicted_per_second', 0):.0f}/s)")
        return (ch["message"].get("content") or "").strip(), int(u.get("prompt_tokens", 0)), int(u.get("completion_tokens", 0)), ch.get("finish_reason") == "length"
