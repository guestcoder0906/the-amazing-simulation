"""
engine.py - headless local multimodal AI engine for The Amazing Simulation.

Picks the smartest model setup that fits entirely in GPU VRAM (or Apple-Silicon unified memory) at 4-bit / 8-bit,
never spilling into slow system RAM:

  16 GB+ :  google/gemma-3-12b-it (vision + reasoning; 8-bit when there is room, else 4-bit)
            + faster-whisper large-v3-turbo for audio
            + Qwen/Qwen2.5-Coder-14B-Instruct (4-bit) for pure coding requests, when it also fits
  8-12 GB:  Qwen/Qwen2.5-Omni-7B (4-bit): audio, images, reasoning and code in one model
  < 8 GB :  google/gemma-3n-E4B-it (4-bit): small native audio + vision model
  Mac    :  the MLX equivalents through mlx-vlm / mlx-lm (4-bit or 8-bit by unified memory)

Models load lazily on the first request and are fully unloaded (GPU + RAM freed) after IDLE_SECONDS without use.
A LoRA adapter in ./my_adapter (made by train.py) is applied automatically whenever it exists.

The engine speaks the Anthropic Messages format (content blocks, tools, tool_use / tool_result, stop_reason) so the
website keeps the exact request and response structure it already uses.
"""
from __future__ import annotations

import base64
import gc
import io
import json
import os
import platform
import re
import sys
import tempfile
import threading
import time
import uuid

import promptfit
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ADAPTER_DIR = Path(os.environ.get("LOCAL_AI_ADAPTER", HERE / "my_adapter"))
IDLE_SECONDS = int(os.environ.get("LOCAL_AI_IDLE_SECONDS", "300"))  # 5 minutes
MAX_IMAGE_SIDE = int(os.environ.get("LOCAL_AI_MAX_IMAGE_SIDE", "896"))
MAX_IMAGES = int(os.environ.get("LOCAL_AI_MAX_IMAGES", "4"))

# Official model ids (ungated mirrors are tried automatically if an official repo needs a Hugging Face login).
GEMMA3_12B = "google/gemma-3-12b-it"
GEMMA3N_E4B = "google/gemma-3n-E4B-it"
QWEN_OMNI_7B = "Qwen/Qwen2.5-Omni-7B"
QWEN_CODER_14B = "Qwen/Qwen2.5-Coder-14B-Instruct"
WHISPER = "large-v3-turbo"
MIRRORS = {GEMMA3_12B: "unsloth/gemma-3-12b-it", GEMMA3N_E4B: "unsloth/gemma-3n-E4B-it"}
MLX_IDS = {  # Apple Silicon (mlx-community conversions)
    (GEMMA3_12B, 4): "mlx-community/gemma-3-12b-it-4bit",
    (GEMMA3_12B, 8): "mlx-community/gemma-3-12b-it-8bit",
    (GEMMA3N_E4B, 4): "mlx-community/gemma-3n-E4B-it-4bit",
    (GEMMA3N_E4B, 8): "mlx-community/gemma-3n-E4B-it-8bit",
    (QWEN_CODER_14B, 4): "mlx-community/Qwen2.5-Coder-14B-Instruct-4bit",
}
# Approximate resident size in GB (weights + working memory for a long prompt) by precision.
FOOTPRINT = {
    (GEMMA3_12B, 4): 9.0, (GEMMA3_12B, 8): 14.5,
    (QWEN_OMNI_7B, 4): 6.8, (QWEN_OMNI_7B, 8): 11.0,
    (GEMMA3N_E4B, 4): 4.6, (GEMMA3N_E4B, 8): 7.5,
    (QWEN_CODER_14B, 4): 9.8,
}
WHISPER_GB = 1.2
NATIVE_AUDIO = {QWEN_OMNI_7B, GEMMA3N_E4B}
VISION = {GEMMA3_12B, QWEN_OMNI_7B, GEMMA3N_E4B}


def log(*a):
    print("[engine]", *a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------------------------- hardware + plan
@dataclass
class Hardware:
    backend: str  # cuda | mlx | cpu
    name: str
    total_gb: float
    usable_gb: float


def detect_hardware() -> Hardware:
    if sys.platform == "darwin" and platform.machine() == "arm64":
        import psutil
        total = psutil.virtual_memory().total / 2**30
        # macOS lets the GPU wire roughly 70-75% of unified memory; stay inside it so nothing swaps
        return Hardware("mlx", "Apple Silicon", total, total * 0.70 - 1.0)
    try:
        import torch
        if torch.cuda.is_available():
            p = torch.cuda.get_device_properties(0)
            total = p.total_memory / 2**30
            return Hardware("cuda", p.name, total, total * 0.92 - 0.4)
    except Exception as e:  # torch missing or broken driver
        log("no CUDA:", e)
    import psutil
    total = psutil.virtual_memory().total / 2**30
    return Hardware("cpu", "CPU", total, min(total * 0.5, 12))


@dataclass
class Plan:
    main: str
    bits: int
    coder: bool = False
    whisper: bool = False
    notes: list[str] = field(default_factory=list)


def adapter_info() -> dict | None:
    """The LoRA adapter made by train.py, if any: {'base': official model id, ...}."""
    meta = ADAPTER_DIR / "local_ai.json"
    if not ADAPTER_DIR.is_dir():
        return None
    if meta.exists():
        try:
            return json.loads(meta.read_text(encoding="utf-8"))
        except Exception:
            pass
    cfg = ADAPTER_DIR / "adapter_config.json"
    if cfg.exists():  # adapter made elsewhere: map its base model name to one of ours
        base = str(json.loads(cfg.read_text(encoding="utf-8")).get("base_model_name_or_path", "")).lower()
        for mid in (GEMMA3_12B, GEMMA3N_E4B, QWEN_OMNI_7B, QWEN_CODER_14B):
            if mid.split("/")[1].lower() in base:
                return {"base": mid}
    return None


def make_plan(hw: Hardware) -> Plan:
    forced = os.environ.get("LOCAL_AI_MAIN")
    if forced:
        return Plan(forced, int(os.environ.get("LOCAL_AI_BITS", "4")), whisper=forced not in NATIVE_AUDIO, notes=["forced by LOCAL_AI_MAIN"])
    budget = hw.usable_gb
    # a trained adapter wins whenever its base model fits (so the custom-trained brain is always the one answering)
    ad = adapter_info()
    if ad and ad.get("base") in {m for (m, _b) in FOOTPRINT}:
        base = ad["base"]
        need = FOOTPRINT[(base, 4)] + (0 if base in NATIVE_AUDIO else WHISPER_GB)
        if need <= budget:
            p = Plan(base, 4, whisper=True, notes=["using the custom adapter in ./my_adapter"])
            return p
        log(f"adapter base {base} needs ~{need:.1f} GB but only {budget:.1f} GB is usable: running without it")
    if hw.total_gb >= 16:
        p = Plan(GEMMA3_12B, 4, whisper=True)
        left = budget - FOOTPRINT[(GEMMA3_12B, 4)] - WHISPER_GB
        if left >= FOOTPRINT[(QWEN_CODER_14B, 4)]:
            p.coder = True
            left -= FOOTPRINT[(QWEN_CODER_14B, 4)]
        if left >= FOOTPRINT[(GEMMA3_12B, 8)] - FOOTPRINT[(GEMMA3_12B, 4)]:
            p.bits = 8
        if FOOTPRINT[(GEMMA3_12B, 4)] + WHISPER_GB > budget:  # a very tight 16 GB card: the 7B omni model instead
            p = Plan(QWEN_OMNI_7B, 8 if budget >= FOOTPRINT[(QWEN_OMNI_7B, 8)] else 4)
        return p
    if hw.backend == "cpu":  # no GPU: the small model is the only one that answers in reasonable time
        return Plan(GEMMA3N_E4B, 16, notes=["CPU only: slow"])
    if hw.total_gb >= 7.5:
        return Plan(QWEN_OMNI_7B, 8 if budget >= FOOTPRINT[(QWEN_OMNI_7B, 8)] else 4)
    return Plan(GEMMA3N_E4B, 4)


# ---------------------------------------------------------------------------------------------- media helpers
def load_image(data: Any):
    """PIL image from bytes, base64 / data URL, path or PIL; resized so the longest side <= MAX_IMAGE_SIDE."""
    from PIL import Image
    if isinstance(data, Image.Image):
        img = data
    else:
        if isinstance(data, str):
            if data.startswith("data:"):
                data = data.split(",", 1)[1]
            if os.path.exists(data):
                img = Image.open(data)
            else:
                img = Image.open(io.BytesIO(base64.b64decode(data)))
        else:
            img = Image.open(io.BytesIO(data))
    img = img.convert("RGB")
    s = max(img.size)
    if s > MAX_IMAGE_SIDE:
        k = MAX_IMAGE_SIDE / s
        img = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))))
    return img


def load_audio(data: Any):
    """16 kHz mono float32 numpy array from bytes, base64 / data URL or a path (wav, mp3, m4a, ogg, webm...)."""
    import numpy as np
    if isinstance(data, np.ndarray):
        return data.astype("float32")
    if isinstance(data, str):
        if data.startswith("data:"):
            data = data.split(",", 1)[1]
        if os.path.exists(data):
            data = Path(data).read_bytes()
        else:
            data = base64.b64decode(data)
    return _decode_16k(data)


def _decode_16k(raw: bytes):
    """Any audio container (wav, webm/opus, mp3, m4a, ogg...) -> 16 kHz mono float32, using PyAV directly."""
    import av
    import numpy as np
    out = []
    with av.open(io.BytesIO(raw), mode="r") as c:
        stream = next(s for s in c.streams if s.type == "audio")
        rs = av.AudioResampler(format="flt", layout="mono", rate=16000)
        for frame in c.decode(stream):
            for f in rs.resample(frame):
                out.append(f.to_ndarray().reshape(-1))
        for f in rs.resample(None):  # flush
            out.append(f.to_ndarray().reshape(-1))
    return np.concatenate(out).astype("float32") if out else np.zeros(1600, dtype="float32")


def _force_sdpa(model) -> dict:
    """Make every sub-model (text, vision, audio) use PyTorch's memory-efficient attention. The slow "eager" mode builds a
    full prompt x prompt score matrix per layer, which for long game prompts no longer fits in 8 GB and spills into slow
    shared memory. Same maths, same answers: only how the attention is computed changes. Returns what each part uses."""
    seen = {}
    for name, mod in model.named_modules():
        cfg = getattr(mod, "config", None)
        if cfg is not None and hasattr(cfg, "_attn_implementation"):
            before = cfg._attn_implementation
            if before in (None, "eager"):
                try:
                    cfg._attn_implementation = "sdpa"
                except Exception:
                    pass
            key = type(cfg).__name__
            seen.setdefault(key, f"{before} -> {cfg._attn_implementation}")
        if hasattr(mod, "_attn_implementation") and getattr(mod, "_attn_implementation") in (None, "eager"):
            try:
                mod._attn_implementation = "sdpa"
            except Exception:
                pass
    log("attention:", seen)
    return seen


def _last_position_logits(model):
    """Generation only needs the next-word scores for the LAST position. Models whose forward has no `logits_to_keep`
    compute scores for every prompt position (a 5k-token prompt x 152k vocabulary = ~3 GB), which overflows an 8 GB GPU
    into slow shared memory. This makes the output layer score only the last position while generating."""
    lm = getattr(model, "lm_head", None)
    if lm is None or getattr(lm, "_last_only", False):
        return
    orig = lm.forward

    def forward(h, *a, **k):
        if not lm.training and h.dim() == 3 and h.shape[1] > 1:
            h = h[:, -1:, :]
        return orig(h, *a, **k)

    lm.forward = forward
    lm._last_only = True


def write_wav(arr) -> str:
    import soundfile as sf
    f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    f.close()
    sf.write(f.name, arr, 16000)
    return f.name


# ---------------------------------------------------------------------------------------------- tool protocol
TOOL_RX = re.compile(r"<tool_call>\s*(.*?)\s*</tool_call>", re.S)


def tools_prompt(tools: list[dict]) -> str:
    lines = [
        "You can use tools. To call a tool, write exactly this (one block per call, JSON inside):",
        "<tool_call>",
        '{"name": "tool_name", "input": {"arg": "value"}}',
        "</tool_call>",
        "If the request needs several actions (e.g. make something AND walk), put one <tool_call> block for EACH action in",
        "the same reply. Never describe an action in words instead of calling its tool: an action written as text does",
        "nothing. After your calls, stop: the results come back as <tool_result> blocks, then continue.",
        "Use only these tools:",
    ]
    for t in tools:
        schema = t.get("input_schema") or t.get("inputSchema") or {"type": "object", "properties": {}}
        lines.append(f"\n## {t.get('name')}\n{str(t.get('description', '')).strip()}\ninput schema: {json.dumps(schema, separators=(',', ':'))}")
    return "\n".join(lines)


def _loads_lenient(s: str):
    s = s.strip().strip("`")
    if s.startswith("json"):
        s = s[4:]
    try:
        return json.loads(s)
    except Exception:
        pass
    i, j = s.find("{"), s.rfind("}")
    if i >= 0 and j > i:
        try:
            return json.loads(s[i:j + 1])
        except Exception:
            return None
    return None


def parse_reply(text: str, tools: list[dict]) -> list[dict]:
    """Model text -> Anthropic content blocks (text + tool_use)."""
    names = {t.get("name") for t in tools or []}
    blocks: list[dict] = []
    pos = 0
    for m in TOOL_RX.finditer(text):
        pre = text[pos:m.start()].strip()
        if pre:
            blocks.append({"type": "text", "text": pre})
        obj = _loads_lenient(m.group(1))
        if isinstance(obj, dict) and obj.get("name") in names:
            args = obj.get("input", obj.get("arguments", obj.get("parameters", {})))
            if isinstance(args, str):
                args = _loads_lenient(args) or {}
            blocks.append({"type": "tool_use", "id": "toolu_" + uuid.uuid4().hex[:24], "name": obj["name"], "input": args or {}})
        pos = m.end()
    rest = text[pos:].strip()
    if rest:
        # a model that forgot the tags but wrote tool calls as bare JSON objects (one or several): use every one
        bare, leftover = _bare_calls(rest, names) if names else ([], rest)
        if bare:
            if leftover.strip():
                blocks.append({"type": "text", "text": leftover.strip()})
            for obj in bare:
                args = obj.get("input", obj.get("arguments", obj.get("parameters", {})))
                if isinstance(args, str):
                    args = _loads_lenient(args) or {}
                blocks.append({"type": "tool_use", "id": "toolu_" + uuid.uuid4().hex[:24], "name": obj["name"], "input": args or {}})
        else:
            # an action written as text instead of a call, e.g. "(body part=move pose=walk)" or body(part="move", pose="walk"):
            # turn it into the real tool call it describes, so it actually happens
            kept = rest
            for m in PSEUDO_RX.finditer(rest):
                name, argstr = m.group(1) or m.group(3), m.group(2) or m.group(4) or ""
                if name not in names:
                    continue
                args = {k: v.strip().strip("\"'") for k, v in KV_RX.findall(argstr)}
                if not args:
                    continue
                blocks.append({"type": "tool_use", "id": "toolu_" + uuid.uuid4().hex[:24], "name": name, "input": args})
                kept = kept.replace(m.group(0), "")
            if kept.strip():
                blocks.insert(len([b for b in blocks if b["type"] == "text"]), {"type": "text", "text": kept.strip()})
    return blocks or [{"type": "text", "text": ""}]


def _bare_calls(text: str, names: set) -> tuple[list[dict], str]:
    """Every top-level {...} JSON object in text that names a known tool, plus the text left around them."""
    found, keep, i, n = [], [], 0, len(text)
    while i < n:
        if text[i] != "{":
            keep.append(text[i])
            i += 1
            continue
        depth, j, in_str, esc = 0, i, False, False
        while j < n:
            ch = text[j]
            if in_str:
                esc = (ch == "\\" and not esc)
                if ch == '"' and not esc:
                    in_str = False
            elif ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        chunk = text[i:j + 1]
        try:
            obj = json.loads(chunk)
        except Exception:
            obj = None
        if isinstance(obj, dict) and obj.get("name") in names:
            found.append(obj)
        else:
            keep.append(chunk)
        i = j + 1
    left = re.sub(r"```(json)?\s*```", "", "".join(keep))
    return found, left


PSEUDO_RX = re.compile(r"\(\s*([A-Za-z_]\w*)\s+([^()]*=[^()]*)\)|\b([A-Za-z_]\w*)\s*\(([^()]*=[^()]*)\)")
KV_RX = re.compile(r"(\w+)\s*[=:]\s*(\"[^\"]*\"|'[^']*'|[^,\s)]+)")


CODE_RX = re.compile(r"```|\b(function|class|def|const|let|var|return|import|javascript|typescript|python|code|script|bug|debug|"
                     r"compile|regex|sql|html|css|json|refactor|algorithm|api)\b", re.I)


def looks_like_coding(text: str) -> bool:
    return len(CODE_RX.findall(text[-6000:])) >= 3


# ---------------------------------------------------------------------------------------------- the engine
class Engine:
    def __init__(self):
        self.hw = detect_hardware()
        self.plan = make_plan(self.hw)
        self.main = None          # (model, processor) or mlx tuple
        self.coder = None
        self.whisper = None
        self.adapter_on = False
        self.lock = threading.RLock()
        self.busy = 0
        self.last_used = 0.0
        self.loaded_at = 0.0
        log(f"hardware: {self.hw.name} ({self.hw.backend}), {self.hw.total_gb:.1f} GB total, ~{self.hw.usable_gb:.1f} GB usable")
        log(f"plan: {self.plan}")
        threading.Thread(target=self._idle_watch, daemon=True).start()

    # ------------------------------------------------------------------ status / lifecycle
    def status(self) -> dict:
        return {"loaded": self.main is not None, "hardware": self.hw.__dict__, "main": self.plan.main, "bits": self.plan.bits,
                "coder": QWEN_CODER_14B if self.plan.coder else None, "whisper": WHISPER if self.plan.whisper else None,
                "adapter": self.adapter_on, "idle_unload_seconds": IDLE_SECONDS, "attention": getattr(self, "attn", None),
                "idle_for": round(time.time() - self.last_used, 1) if self.last_used else None}

    def _idle_watch(self):
        while True:
            time.sleep(10)
            if self.main is not None and not self.busy and time.time() - self.last_used > IDLE_SECONDS:
                with self.lock:
                    if self.main is not None and not self.busy and time.time() - self.last_used > IDLE_SECONDS:
                        log(f"idle for {IDLE_SECONDS}s: unloading everything")
                        self.unload()

    def unload(self):
        with self.lock:
            self.main = self.coder = self.whisper = None
            self.adapter_on = False
            gc.collect()
            if self.hw.backend == "cuda":
                import torch
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
            elif self.hw.backend == "mlx":
                try:
                    import mlx.core as mx
                    (getattr(mx, "clear_cache", None) or mx.metal.clear_cache)()
                except Exception:
                    pass
            gc.collect()

    def ensure_loaded(self):
        with self.lock:
            if self.main is not None:
                return
            t0 = time.time()
            self.plan = make_plan(self.hw)  # re-plan: an adapter may have been trained since the last load
            try:
                self._load_all()
            except Exception as e:
                msg = str(e).lower()
                if self.hw.backend == "cuda" and ("out of memory" in msg or "cuda error" in msg):
                    log("ran out of VRAM, falling back to a smaller setup:", e)
                    self.unload()
                    smaller = {GEMMA3_12B: (QWEN_OMNI_7B, 4), QWEN_OMNI_7B: (GEMMA3N_E4B, 4)}.get(self.plan.main)
                    if not smaller:
                        raise
                    self.plan = Plan(smaller[0], smaller[1], whisper=smaller[0] not in NATIVE_AUDIO)
                    self._load_all()
                else:
                    raise
            self.loaded_at = time.time()
            log(f"ready in {time.time() - t0:.0f}s")

    # ------------------------------------------------------------------ loading
    def _hf_load(self, loader, mid, **kw):
        try:
            return loader(mid, **kw)
        except Exception as e:
            alt = MIRRORS.get(mid)
            if alt and any(s in str(e).lower() for s in ("gated", "401", "403", "access", "authenticat")):
                log(f"{mid} needs a Hugging Face login/licence; using the mirror {alt}")
                return loader(alt, **kw)
            raise

    def _bnb(self, bits):
        import torch
        from transformers import BitsAndBytesConfig
        if bits == 8:
            return BitsAndBytesConfig(load_in_8bit=True)
        return BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True,
                                  bnb_4bit_compute_dtype=torch.bfloat16)

    def _load_all(self):
        p = self.plan
        log(f"loading {p.main} ({p.bits}-bit) on {self.hw.backend}...")
        if self.hw.backend == "mlx":
            self._load_mlx()
        else:
            self.main = self._load_torch(p.main, p.bits)
            if p.coder:
                self.coder = self._load_torch(QWEN_CODER_14B, 4)
        if p.whisper or p.main not in NATIVE_AUDIO or self.adapter_on:
            self._load_whisper()

    def _load_torch(self, mid, bits):
        import torch
        cuda = self.hw.backend == "cuda"
        kw: dict = {"torch_dtype": torch.bfloat16, "low_cpu_mem_usage": True}
        if cuda:
            kw["quantization_config"] = self._bnb(bits)
            kw["device_map"] = {"": 0}  # everything on the GPU: never spill into system RAM
        if mid == QWEN_OMNI_7B:
            from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniProcessor
            # text answers only: never build the speech generator (talker + token2wav), which would eat ~1.5 GB of VRAM
            # that long prompts need; memory-efficient attention keeps long game prompts inside 8 GB
            model = self._hf_load(Qwen2_5OmniForConditionalGeneration.from_pretrained, mid, enable_audio_output=False,
                                  attn_implementation="sdpa", **kw)
            _last_position_logits(getattr(model, "thinker", model))
            self.attn = _force_sdpa(model)
            proc = Qwen2_5OmniProcessor.from_pretrained(mid)
        elif mid in (GEMMA3_12B, GEMMA3N_E4B):
            from transformers import AutoProcessor
            if mid == GEMMA3_12B:
                from transformers import Gemma3ForConditionalGeneration as M
            else:
                from transformers import Gemma3nForConditionalGeneration as M
            model = self._hf_load(M.from_pretrained, mid, **kw)
            proc = self._hf_load(AutoProcessor.from_pretrained, mid)
        else:  # text-only coder
            from transformers import AutoModelForCausalLM, AutoTokenizer
            model = self._hf_load(AutoModelForCausalLM.from_pretrained, mid, **kw)
            proc = AutoTokenizer.from_pretrained(mid)
        model.eval()
        ad = adapter_info()
        if ad and ad.get("base") == mid:
            from peft import PeftModel
            model = PeftModel.from_pretrained(model, str(ADAPTER_DIR))
            model.eval()
            self.adapter_on = True
            log("custom adapter loaded from", ADAPTER_DIR)
        return (mid, model, proc)

    def _load_mlx(self):
        from mlx_vlm import load as vlm_load
        p = self.plan
        if p.main == QWEN_OMNI_7B:  # no MLX build of Omni: the closest MLX model with native audio + vision
            p.main, p.bits = GEMMA3N_E4B, 8 if self.hw.usable_gb >= 9 else 4
        repo = MLX_IDS.get((p.main, p.bits)) or MLX_IDS[(p.main, 4)]
        ad = adapter_info()
        kw = {}
        if ad and ad.get("base") == p.main and (ADAPTER_DIR / "adapters.safetensors").exists():
            kw["adapter_path"] = str(ADAPTER_DIR)
            self.adapter_on = True
        model, proc = vlm_load(repo, **kw)
        self.main = (p.main, model, proc, repo)
        if p.coder:
            from mlx_lm import load as lm_load
            m2, tok = lm_load(MLX_IDS[(QWEN_CODER_14B, 4)])
            self.coder = (QWEN_CODER_14B, m2, tok, "mlx-lm")

    def _load_whisper(self):
        if self.whisper is not None:
            return
        from faster_whisper import WhisperModel
        if self.hw.backend == "cuda":
            self.whisper = WhisperModel(WHISPER, device="cuda", compute_type="int8_float16")
        else:
            self.whisper = WhisperModel(WHISPER, device="cpu", compute_type="int8")

    # ------------------------------------------------------------------ public API
    def transcribe(self, audio) -> str:
        self._load_whisper()
        segs, _info = self.whisper.transcribe(audio, beam_size=5, vad_filter=True)
        return " ".join(s.text.strip() for s in segs).strip()

    HEAR_PROMPT = (
        "Listen to this audio clip carefully, the way a person with good ears would. Reply with ONLY one JSON object, no prose:\n"
        '{"transcript": "the exact words spoken, empty if nobody speaks", "language": "language of the speech", '
        '"emotion": "one or two words for the feeling in the voice", '
        '"tone": "how it is said, e.g. excited, sarcastic, whispering, shouting, questioning, joking, pleading", '
        '"energy": "low | medium | high", "voice": "short description of the speaker\'s voice (age, pitch, texture)", '
        '"sounds": "other sounds besides speech (music, laughter, clapping, footsteps, noise...) or empty", '
        '"summary": "one sentence on what is happening in this audio"}')

    def hear(self, audio, context: str | None = None) -> dict:
        """The local AI listens to an audio clip itself: words plus how they were said and what else is audible.
        Native-audio models (Qwen2.5-Omni, Gemma 3n) hear the sound directly; others get the Whisper transcript."""
        arr = load_audio(audio)
        self.ensure_loaded()
        ask = self.HEAR_PROMPT + (f"\nContext: {context}" if context else "")
        if self.main[0] in NATIVE_AUDIO:
            out = self.chat([{"role": "user", "content": [{"type": "audio", "audio": arr}, {"type": "text", "text": ask}]}],
                            max_tokens=320, temperature=0.1)
            heard_directly = True
        else:
            words = self.transcribe(arr)
            out = self.chat([{"role": "user", "content": [{"type": "text", "text": ask + f"\n(You only have the transcript: {words!r}. "
                                                           "Judge emotion and tone from the words.)"}]}], max_tokens=320, temperature=0.1)
            heard_directly = False
        data = _loads_lenient(out["text"]) or {}
        if not isinstance(data, dict):
            data = {}
        if not data.get("transcript") and not heard_directly:
            data["transcript"] = words
        data.setdefault("transcript", "")
        data["heard_directly"] = heard_directly
        data["model"] = out["model"]
        return data

    def complete(self, prompt: str, image=None, audio=None, use_web_search=False, system: str | None = None,
                 max_tokens: int = 1024, temperature: float = 0.6) -> dict:
        """Simple single-turn call: text + optional image + optional audio."""
        content: list[dict] = []
        if image is not None:
            content.append({"type": "image", "image": load_image(image)})
        if audio is not None:
            content.append({"type": "audio", "audio": load_audio(audio)})
        content.append({"type": "text", "text": prompt or "Describe this."})
        out = self.chat([{"role": "user", "content": content}], system=system, max_tokens=max_tokens,
                        temperature=temperature, use_web_search=use_web_search)
        return {"text": out["text"], "model": out["model"], "web_search": out.get("web_search", False)}

    def messages(self, body: dict) -> dict:
        """Anthropic Messages API -> Anthropic Messages response (what the website already sends and expects)."""
        tools = body.get("tools") or []
        system = body.get("system")
        if isinstance(system, list):
            system = "\n".join(b.get("text", "") for b in system if isinstance(b, dict))
        msgs = [self._from_anthropic(m) for m in body.get("messages", [])]
        model_hint = str(body.get("model", ""))
        tools = promptfit.compact_tools(tools)
        kind = "light" if body.get("quick") else promptfit.classify(msgs, tools, model_hint)
        temp = body.get("temperature")
        st = promptfit.settings_for(kind, int(body.get("max_tokens") or 2048), None if temp is None else float(temp))
        out = self.chat(msgs, system=system, tools=tools, max_tokens=st["max_tokens"], temperature=st["temperature"],
                        use_web_search=bool(body.get("use_web_search")), kind=kind)
        blocks = parse_reply(out["text"], tools)
        stop = "tool_use" if any(b["type"] == "tool_use" for b in blocks) else ("max_tokens" if out["hit_limit"] else "end_turn")
        return {"id": "msg_" + uuid.uuid4().hex[:24], "type": "message", "role": "assistant", "model": out["model"],
                "content": blocks, "stop_reason": stop, "stop_sequence": None,
                "usage": {"input_tokens": out["in_tokens"], "output_tokens": out["out_tokens"]}}

    # ------------------------------------------------------------------ conversion
    def _from_anthropic(self, m: dict) -> dict:
        role = "assistant" if m.get("role") == "assistant" else "user"
        content = m.get("content")
        if isinstance(content, str):
            return {"role": role, "content": [{"type": "text", "text": content}]}
        out: list[dict] = []
        for b in content or []:
            t = b.get("type")
            if t == "text":
                out.append({"type": "text", "text": b.get("text", "")})
            elif t == "image":
                src = b.get("source", {})
                try:
                    out.append({"type": "image", "image": load_image(src.get("data") or src.get("url", ""))})
                except Exception as e:
                    out.append({"type": "text", "text": f"(an image could not be read: {e})"})
            elif t in ("audio", "input_audio"):
                src = b.get("source", b)
                try:
                    out.append({"type": "audio", "audio": load_audio(src.get("data", ""))})
                except Exception as e:
                    out.append({"type": "text", "text": f"(an audio clip could not be read: {e})"})
            elif t == "tool_use":
                out.append({"type": "text", "text": "<tool_call>\n" + json.dumps({"name": b.get("name"), "input": b.get("input", {})}) + "\n</tool_call>"})
            elif t == "tool_result":
                c = b.get("content")
                if isinstance(c, list):
                    c = "\n".join(x.get("text", "") for x in c if isinstance(x, dict))
                out.append({"type": "text", "text": f"<tool_result>\n{c}\n</tool_result>"})
            # thinking / other blocks are dropped
        return {"role": role, "content": out}

    # ------------------------------------------------------------------ core generation
    def chat(self, msgs: list[dict], system: str | None = None, tools: list[dict] | None = None, max_tokens: int = 1024,
             temperature: float = 0.6, use_web_search: bool = False, kind: str | None = None) -> dict:
        self.busy += 1
        try:
            self.ensure_loaded()
            with self.lock:
                self.last_used = time.time()
                sys_parts = [promptfit.squeeze(system)] if system else []
                web = False
                if use_web_search:
                    from search import web_context
                    q = next((c["text"] for m in reversed(msgs) if m["role"] == "user" for c in m["content"] if c["type"] == "text" and c["text"].strip()), "")
                    ctx = web_context(q)
                    if ctx:
                        sys_parts.append(ctx)
                        web = True
                if tools:
                    sys_parts.append(tools_prompt(tools))
                if kind:  # quick tasks answer straight away; big tasks plan privately first (removed from the reply)
                    sys_parts.append(promptfit.THINK_INSTRUCTION if kind == "heavy" else promptfit.LIGHT_INSTRUCTION)
                msgs = promptfit.compact_messages(self._prepare_media(msgs))
                sys_text = "\n\n".join(p for p in sys_parts if p)
                msgs, fitrep = promptfit.fit(sys_text, msgs, promptfit.default_budget(self.hw.total_gb))
                if fitrep.get("dropped_turns") or fitrep.get("trimmed_results"):
                    log("prompt fitted to the GPU:", fitrep)
                has_media = any(c["type"] in ("image", "audio") for m in msgs for c in m["content"])
                all_text = "\n".join(c.get("text", "") for m in msgs for c in m["content"] if c["type"] == "text")
                target = self.coder if (self.coder and not has_media and looks_like_coding(all_text)) else self.main
                text, n_in, n_out, hit = self._generate(target, sys_text, msgs, max_tokens, temperature)
                text = promptfit.strip_thinking(text)
                self.last_used = time.time()
                return {"text": text, "model": "local:" + target[0].split("/")[-1] + (" + my_adapter" if self.adapter_on and target is self.main else ""),
                        "in_tokens": n_in, "out_tokens": n_out, "hit_limit": hit, "web_search": web}
        finally:
            self.busy -= 1

    def _prepare_media(self, msgs):
        """Keep the newest MAX_IMAGES images; turn audio into a transcript for models without native audio
        (and also alongside the audio when a custom adapter was trained on transcripts)."""
        mid = self.main[0]
        seen = 0
        out = []
        for m in reversed(msgs):
            content = []
            for c in reversed(m["content"]):
                if c["type"] == "image":
                    seen += 1
                    if seen > MAX_IMAGES or mid not in VISION:
                        continue
                if c["type"] == "audio":
                    if mid not in NATIVE_AUDIO or self.adapter_on:
                        try:
                            content.append({"type": "text", "text": "[Audio transcript]: " + self.transcribe(c["audio"])})
                        except Exception as e:
                            content.append({"type": "text", "text": f"(audio could not be transcribed: {e})"})
                    if mid not in NATIVE_AUDIO:
                        continue
                content.append(c)
            out.append({"role": m["role"], "content": list(reversed(content))})
        out.reverse()
        # chat templates want alternating turns starting with the user
        merged: list[dict] = []
        for m in out:
            if merged and merged[-1]["role"] == m["role"]:
                merged[-1]["content"] += m["content"]
            else:
                merged.append(m)
        if merged and merged[0]["role"] != "user":
            merged.insert(0, {"role": "user", "content": [{"type": "text", "text": "(continue)"}]})
        return merged

    def _generate(self, target, system, msgs, max_tokens, temperature):
        if self.hw.backend == "mlx":
            return self._generate_mlx(target, system, msgs, max_tokens, temperature)
        import torch
        mid, model, proc = target
        sample = temperature > 0.01
        gen_kw = dict(max_new_tokens=max_tokens, do_sample=sample, repetition_penalty=1.05)
        if sample:
            gen_kw.update(temperature=temperature, top_p=0.9)
        tmp_files: list[str] = []
        try:
            if mid == QWEN_OMNI_7B:
                conv = ([{"role": "system", "content": [{"type": "text", "text": system}]}] if system else []) + msgs
                text = proc.apply_chat_template(conv, add_generation_prompt=True, tokenize=False)
                images = [c["image"] for m in msgs for c in m["content"] if c["type"] == "image"] or None
                audios = [c["audio"] for m in msgs for c in m["content"] if c["type"] == "audio"] or None
                inputs = proc(text=text, images=images, audio=audios, return_tensors="pt", padding=True)
                inputs = inputs.to(model.device, dtype=torch.bfloat16)
                with torch.inference_mode():
                    # text answers come from the "thinker" (the speech "talker" is switched off to save VRAM)
                    base = getattr(model, "base_model", None)
                    base = getattr(base, "model", base) if base is not None and hasattr(model, "peft_config") else model
                    thinker = getattr(base, "thinker", None)
                    if thinker is not None:
                        ids = thinker.generate(**inputs, use_audio_in_video=False, **gen_kw)
                    else:
                        ids = model.generate(**inputs, return_audio=False, use_audio_in_video=False, **gen_kw)
                if isinstance(ids, tuple):
                    ids = ids[0]
                new = ids[0][inputs["input_ids"].shape[1]:]
                out = proc.batch_decode([new], skip_special_tokens=True)[0]
            elif mid in (GEMMA3_12B, GEMMA3N_E4B):
                conv = []
                if system:
                    conv.append({"role": "system", "content": [{"type": "text", "text": system}]})
                for m in msgs:
                    content = []
                    for c in m["content"]:
                        if c["type"] == "audio":
                            path = write_wav(c["audio"])
                            tmp_files.append(path)
                            content.append({"type": "audio", "audio": path})
                        else:
                            content.append(c)
                    conv.append({"role": m["role"], "content": content})
                inputs = proc.apply_chat_template(conv, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt")
                inputs = inputs.to(model.device, dtype=torch.bfloat16)
                with torch.inference_mode():
                    ids = model.generate(**inputs, **gen_kw)
                new = ids[0][inputs["input_ids"].shape[1]:]
                out = proc.decode(new, skip_special_tokens=True)
            else:  # coder (text only)
                conv = ([{"role": "system", "content": system}] if system else []) + [
                    {"role": m["role"], "content": "\n".join(c.get("text", "") for c in m["content"] if c["type"] == "text")} for m in msgs]
                text = proc.apply_chat_template(conv, add_generation_prompt=True, tokenize=False)
                inputs = proc([text], return_tensors="pt").to(model.device)
                with torch.inference_mode():
                    ids = model.generate(**inputs, **gen_kw)
                new = ids[0][inputs["input_ids"].shape[1]:]
                out = proc.decode(new, skip_special_tokens=True)
            n_in = int(inputs["input_ids"].shape[1])
            n_out = int(len(new))
            return out.strip(), n_in, n_out, n_out >= max_tokens
        finally:
            for f in tmp_files:
                try:
                    os.unlink(f)
                except OSError:
                    pass

    def _generate_mlx(self, target, system, msgs, max_tokens, temperature):
        if target[3] == "mlx-lm":
            from mlx_lm import generate as lm_generate
            from mlx_lm.sample_utils import make_sampler
            _mid, model, tok, _ = target
            conv = ([{"role": "system", "content": system}] if system else []) + [
                {"role": m["role"], "content": "\n".join(c.get("text", "") for c in m["content"] if c["type"] == "text")} for m in msgs]
            prompt = tok.apply_chat_template(conv, add_generation_prompt=True, tokenize=False)
            out = lm_generate(model, tok, prompt=prompt, max_tokens=max_tokens, sampler=make_sampler(temp=temperature, top_p=0.9))
            return out.strip(), 0, 0, False
        from mlx_vlm import generate as vlm_generate
        from mlx_vlm.prompt_utils import apply_chat_template
        _mid, model, proc, _repo = target
        images = [c["image"] for m in msgs for c in m["content"] if c["type"] == "image"]
        tmp = [write_wav(c["audio"]) for m in msgs for c in m["content"] if c["type"] == "audio"]
        try:
            conv = ([{"role": "system", "content": system}] if system else []) + [
                {"role": m["role"], "content": "\n".join(c.get("text", "") for c in m["content"] if c["type"] == "text")} for m in msgs]
            prompt = apply_chat_template(proc, model.config, conv, num_images=len(images), num_audios=len(tmp))
            res = vlm_generate(model, proc, prompt, image=images or None, audio=tmp or None, max_tokens=max_tokens,
                               temperature=temperature, verbose=False)
            text = getattr(res, "text", res)
            n_in = int(getattr(res, "prompt_tokens", 0) or 0)
            n_out = int(getattr(res, "generation_tokens", 0) or 0)
            return str(text).strip(), n_in, n_out, bool(n_out and n_out >= max_tokens)
        finally:
            for f in tmp:
                try:
                    os.unlink(f)
                except OSError:
                    pass


_ENGINE: Engine | None = None


def get_engine() -> Engine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = Engine()
    return _ENGINE


if __name__ == "__main__":  # quick self-test: python engine.py "your question"
    e = get_engine()
    print(json.dumps(e.status(), indent=2))
    q = " ".join(sys.argv[1:]) or "In one sentence, what can you do?"
    print(e.complete(q)["text"])
