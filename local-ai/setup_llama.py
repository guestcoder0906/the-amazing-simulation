"""
setup_llama.py - downloads the fast inference engine (llama.cpp's llama-server) and the model files it runs.

  * llama.cpp: the newest official release build for this machine (Windows: CUDA 13.5 for NVIDIA incl. RTX 50-series,
    Vulkan for other GPUs; macOS: Metal build; Linux: Vulkan/CPU build), unpacked into the local AI data folder
  * model: Qwen2.5-Omni-7B in GGUF (Q4_K_M) plus its vision/audio projector (mmproj), from ggml-org on Hugging Face
    (larger GPUs get the Q8_0 weights for higher quality)

Safe to run again: anything already present is skipped. Run by start.bat / start.sh before the API starts.
"""
from __future__ import annotations

import io
import json
import os
import platform
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = Path(os.environ.get("LOCAL_AI_DATA") or (Path(os.environ.get("LOCALAPPDATA", Path.home())) / "AmazingSimAI" if os.name == "nt"
                                                    else Path.home() / ".amazing-sim-ai"))
LLAMA_DIR = DATA / "llama"
MODEL_DIR = DATA / "models"
REPO = "ggml-org/Qwen2.5-Omni-7B-GGUF"


def log(*a):
    print("[setup]", *a, flush=True)


def vram_gb() -> float:
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=10)
        return float(out.stdout.strip().splitlines()[0]) / 1024
    except Exception:
        return 0.0


def server_path() -> Path | None:
    for name in ("llama-server.exe", "llama-server"):
        for p in LLAMA_DIR.rglob(name):
            return p
    return None


def pick_assets(assets: list[dict]) -> list[dict]:
    names = {a["name"]: a for a in assets}
    sysname, arch = platform.system(), platform.machine().lower()
    want = []
    if sysname == "Windows":
        if vram_gb() > 0:  # NVIDIA: CUDA build (13.x supports Blackwell / RTX 50) + its runtime DLLs
            want = [n for n in names if n.startswith("llama-") and n.endswith("bin-win-cuda-13.5-x64.zip")] + [n for n in names if n == "cudart-llama-bin-win-cuda-13.5-x64.zip"]
            if not want:
                want = [n for n in names if "bin-win-cuda-12" in n and n.endswith("x64.zip")] + [n for n in names if n.startswith("cudart-llama-bin-win-cuda-12")]
        if not want:
            want = [n for n in names if n.endswith("bin-win-vulkan-x64.zip")]
    elif sysname == "Darwin":
        want = [n for n in names if "macos-arm64" in n and n.endswith(".zip")] if arch in ("arm64", "aarch64") else [n for n in names if "macos-x64" in n]
    else:
        want = [n for n in names if "ubuntu" in n and "vulkan" in n and "x64" in n] or [n for n in names if "ubuntu-x64" in n]
    return [names[n] for n in want]


def get_llama():
    if server_path():
        log("llama.cpp already installed:", server_path())
        return
    LLAMA_DIR.mkdir(parents=True, exist_ok=True)
    # newest release that actually has builds for this system ("latest" can point at an unrelated tag)
    rels = json.loads(urllib.request.urlopen("https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=15", timeout=60).read())
    rel, assets = {}, []
    for r in rels:
        assets = pick_assets(r.get("assets", []))
        if assets:
            rel = r
            break
    if not assets:
        sys.exit("No llama.cpp build found for this system")
    for a in assets:
        log(f"downloading {a['name']} ({a['size'] / 2**20:.0f} MB) from {rel['tag_name']}")
        data = urllib.request.urlopen(a["browser_download_url"], timeout=600).read()
        if a["name"].endswith(".zip"):
            zipfile.ZipFile(io.BytesIO(data)).extractall(LLAMA_DIR)
        else:
            import tarfile
            tarfile.open(fileobj=io.BytesIO(data)).extractall(LLAMA_DIR)
    p = server_path()
    if p and os.name != "nt":
        p.chmod(0o755)
    # the CUDA runtime DLLs must sit next to llama-server.exe
    if p:
        for dll in LLAMA_DIR.glob("*.dll"):
            if dll.parent != p.parent:
                shutil.copy2(dll, p.parent / dll.name)
    log("llama.cpp ready:", p)


def get_model():
    from huggingface_hub import hf_hub_download
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    quant = "Q8_0" if vram_gb() >= 14 else "Q4_K_M"
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for f in (f"Qwen2.5-Omni-7B-{quant}.gguf", "mmproj-Qwen2.5-Omni-7B-Q8_0.gguf"):
        if (MODEL_DIR / f).exists():
            log("model file present:", f)
            continue
        log("downloading", f, "...")
        hf_hub_download(REPO, f, local_dir=str(MODEL_DIR))
    (MODEL_DIR / "active.json").write_text(json.dumps({"model": f"Qwen2.5-Omni-7B-{quant}.gguf", "mmproj": "mmproj-Qwen2.5-Omni-7B-Q8_0.gguf"}))
    log("model ready in", MODEL_DIR)


if __name__ == "__main__":
    get_llama()
    get_model()
