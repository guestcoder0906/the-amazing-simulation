"""
train.py - fast LoRA fine-tune of the local AI on your own examples (finishes in about 30-45 minutes).

Drop examples into ./data, then run:   python train.py            (options: --minutes 40 --base ... --epochs 3)
The adapter is saved to ./my_adapter and engine.py loads it automatically from then on (delete the folder to undo).

What you can put in ./data (any mix, sub-folders are fine):
  * JSONL / JSON lines:  {"prompt": "...", "response": "...", "image": "pic.png", "audio": "clip.wav", "system": "..."}
                         ("instruction"/"input" and "output"/"completion" also work; image/audio paths are relative to the file)
  * Text pairs:          name.prompt.txt  +  name.txt                    (prompt -> answer)
  * Image pairs:         name.png|jpg|jpeg|webp|bmp|gif  +  name.txt   (+ optional name.prompt.txt, default "Describe this image.")
  * Audio pairs:         name.wav|mp3|m4a|flac|ogg|webm  +  name.txt   (+ optional name.prompt.txt; audio is transcribed with
                         faster-whisper and trained as "[Audio transcript]: ...", exactly how the engine feeds audio to the adapter)
  * Code pairs:          name.prompt.txt  +  name.py|js|ts|html|css|json|... (prompt -> the code file)

NVIDIA GPUs train with Unsloth (4-bit QLoRA). Apple Silicon trains with mlx-vlm's LoRA.
Base model: google/gemma-3-12b-it with 16 GB+ of VRAM, otherwise google/gemma-3n-E4B-it (both handle images and text and are
supported by Unsloth; Qwen2.5-Omni is not, so on 8-12 GB cards the engine switches to the trained Gemma 3n while the adapter exists).
"""
from __future__ import annotations

import argparse
import json
import os
import random
import shutil
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
OUT = HERE / "my_adapter"
sys.path.insert(0, str(HERE))

IMG = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
AUD = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm", ".aac"}
CODE = {".py", ".js", ".mjs", ".ts", ".tsx", ".jsx", ".html", ".css", ".json", ".java", ".c", ".cpp", ".h", ".cs", ".go", ".rs",
        ".rb", ".php", ".sh", ".ps1", ".sql", ".lua", ".kt", ".swift", ".yaml", ".yml", ".toml", ".md"}


def log(*a):
    print("[train]", *a, flush=True)


# ---------------------------------------------------------------------------------------------- data
def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace").strip()


class Transcriber:
    def __init__(self, device: str):
        self.m = None
        self.device = device

    def __call__(self, path: Path) -> str:
        if self.m is None:
            from faster_whisper import WhisperModel
            self.m = WhisperModel("large-v3-turbo", device="cuda" if self.device == "cuda" else "cpu",
                                  compute_type="int8_float16" if self.device == "cuda" else "int8")
        segs, _ = self.m.transcribe(str(path), beam_size=5, vad_filter=True)
        return " ".join(s.text.strip() for s in segs).strip()


def collect(transcribe) -> list[dict]:
    """-> [{"prompt", "response", "image": Path|None, "system": str|None}] (audio already turned into transcript text)."""
    rows: list[dict] = []
    if not DATA.exists():
        return rows

    def add(prompt, response, image=None, audio=None, system=None):
        prompt, response = (prompt or "").strip(), (response or "").strip()
        if not response:
            return
        if audio is not None:
            try:
                prompt = (prompt + "\n\n" if prompt else "") + "[Audio transcript]: " + transcribe(audio)
            except Exception as e:
                log(f"skipping audio {audio.name}: {e}")
                return
        if not prompt and image is None:
            return
        rows.append({"prompt": prompt or "Describe this image.", "response": response, "image": image, "system": system})

    files = [p for p in DATA.rglob("*") if p.is_file() and not p.name.startswith(".")]
    used: set[Path] = set()
    # 1) JSONL / JSON records
    for p in files:
        if p.suffix.lower() not in (".jsonl", ".json"):
            continue
        try:
            text = read_text(p)
            recs = [json.loads(l) for l in text.splitlines() if l.strip()] if p.suffix.lower() == ".jsonl" else json.loads(text)
            if isinstance(recs, dict):
                recs = [recs]
        except Exception:
            continue  # a .json that is not a dataset (e.g. a code example) is handled as a code file below
        used.add(p)
        for r in recs:
            if not isinstance(r, dict):
                continue
            pr = r.get("prompt") or r.get("instruction") or ""
            if r.get("input"):
                pr = (pr + "\n\n" + str(r["input"])).strip()
            img = (p.parent / r["image"]) if r.get("image") else None
            aud = (p.parent / r["audio"]) if r.get("audio") else None
            add(pr, r.get("response") or r.get("output") or r.get("completion") or "",
                img if img and img.exists() else None, aud if aud and aud.exists() else None, r.get("system"))
    # 2) files paired by name
    by_stem: dict[tuple[Path, str], dict[str, Path]] = {}
    for p in files:
        if p in used:
            continue
        name = p.name
        if name.endswith(".prompt.txt"):
            by_stem.setdefault((p.parent, name[:-11]), {})["prompt"] = p
            continue
        stem, ext = p.stem, p.suffix.lower()
        slot = "answer" if ext == ".txt" else "image" if ext in IMG else "audio" if ext in AUD else "code" if ext in CODE else None
        if slot:
            by_stem.setdefault((p.parent, stem), {})[slot] = p
    for (_d, stem), g in by_stem.items():
        prompt = read_text(g["prompt"]) if "prompt" in g else ""
        if "image" in g and "answer" in g:
            add(prompt or "Describe this image.", read_text(g["answer"]), image=g["image"])
        elif "audio" in g:
            add(prompt or "Reply to this audio.", read_text(g["answer"]) if "answer" in g else "", audio=g["audio"])
        elif "code" in g and "prompt" in g:
            add(prompt, read_text(g["code"]))
        elif "answer" in g and "prompt" in g:
            add(prompt, read_text(g["answer"]))
    return rows


# ---------------------------------------------------------------------------------------------- base model choice
def pick_base(args, backend: str, vram: float) -> str:
    from engine import GEMMA3_12B, GEMMA3N_E4B
    if args.base:
        return args.base
    return GEMMA3_12B if vram >= 16 else GEMMA3N_E4B


def save_meta(base: str, backend: str, n: int, minutes: float):
    (OUT / "local_ai.json").write_text(json.dumps({"base": base, "backend": backend, "examples": n,
                                                   "trained_minutes": round(minutes, 1), "trained_at": time.strftime("%Y-%m-%d %H:%M")}, indent=2))


# ---------------------------------------------------------------------------------------------- NVIDIA: Unsloth
def train_unsloth(rows, base, args, t_start):
    from unsloth import FastVisionModel  # import unsloth first so it can patch transformers
    from unsloth.trainer import UnslothVisionDataCollator
    from PIL import Image
    from transformers import TrainerCallback
    from trl import SFTConfig, SFTTrainer
    from engine import MIRRORS

    deadline = t_start + args.minutes * 60

    class TimeBudget(TrainerCallback):
        """Stops training before the time budget runs out (saving still happens afterwards)."""
        def on_step_end(self, a, state, control, **kw):
            per = (time.time() - t_start) / max(1, state.global_step)
            if time.time() + per * 1.5 > deadline - 120:
                log(f"time budget reached after {state.global_step} steps")
                control.should_training_stop = True
            return control

    has_img = any(r["image"] for r in rows)
    try:
        model, proc = FastVisionModel.from_pretrained(base, load_in_4bit=True, use_gradient_checkpointing="unsloth")
    except Exception as e:
        alt = MIRRORS.get(base)
        if not alt:
            raise
        log(f"{base} could not be loaded ({e}); using the mirror {alt}")
        model, proc = FastVisionModel.from_pretrained(alt, load_in_4bit=True, use_gradient_checkpointing="unsloth")
    model = FastVisionModel.get_peft_model(
        model, finetune_vision_layers=has_img, finetune_language_layers=True, finetune_attention_modules=True,
        finetune_mlp_modules=True, r=args.rank, lora_alpha=args.rank, lora_dropout=0, bias="none", random_state=3407)

    def to_conv(r):
        user = [{"type": "text", "text": r["prompt"]}]
        if r["image"]:
            img = Image.open(r["image"]).convert("RGB")
            img.thumbnail((896, 896))
            user.insert(0, {"type": "image", "image": img})
        conv = []
        if r.get("system"):
            conv.append({"role": "system", "content": [{"type": "text", "text": r["system"]}]})
        conv += [{"role": "user", "content": user}, {"role": "assistant", "content": [{"type": "text", "text": r["response"]}]}]
        return {"messages": conv}

    dataset = [to_conv(r) for r in rows]
    FastVisionModel.for_training(model)
    steps_per_epoch = max(1, len(dataset) // (args.batch * args.accum))
    trainer = SFTTrainer(
        model=model, tokenizer=proc, data_collator=UnslothVisionDataCollator(model, proc), train_dataset=dataset,
        callbacks=[TimeBudget()],
        args=SFTConfig(per_device_train_batch_size=args.batch, gradient_accumulation_steps=args.accum, warmup_steps=min(10, steps_per_epoch),
                       num_train_epochs=args.epochs, learning_rate=args.lr, logging_steps=5, optim="adamw_8bit", weight_decay=0.01,
                       lr_scheduler_type="cosine", seed=3407, output_dir=str(HERE / "outputs"), report_to="none",
                       save_strategy="no", remove_unused_columns=False, dataset_text_field="",
                       dataset_kwargs={"skip_prepare_dataset": True}, max_length=args.max_len, bf16=True))
    trainer.train()
    if OUT.exists():
        shutil.rmtree(OUT)
    model.save_pretrained(str(OUT))
    proc.save_pretrained(str(OUT))


# ---------------------------------------------------------------------------------------------- Apple Silicon: mlx-vlm
def train_mlx(rows, base, args, t_start):
    import subprocess
    from datasets import Dataset, Image as HFImage, Sequence
    from engine import MLX_IDS
    repo = MLX_IDS[(base, 4)]
    tmp = HERE / "outputs" / "mlx_dataset"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    # mlx-vlm's LoRA expects image rows; text-only examples get a small blank image so they still train
    from PIL import Image
    blank = tmp / "blank.png"
    Image.new("RGB", (64, 64), "white").save(blank)
    recs = []
    for r in rows:
        msgs = ([{"role": "system", "content": r["system"]}] if r.get("system") else []) + [
            {"role": "user", "content": r["prompt"]}, {"role": "assistant", "content": r["response"]}]
        recs.append({"images": [str(r["image"] or blank)], "messages": msgs})
    ds = Dataset.from_list(recs).cast_column("images", Sequence(HFImage()))
    ds.to_parquet(str(tmp / "train.parquet"))
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    iters_budget = max(50, int(args.minutes * 60 / 2.5))  # ~2.5 s per step for a 4-bit 4-12B model on M-series
    steps = min(iters_budget, max(50, len(recs) * args.epochs))
    cmd = [sys.executable, "-m", "mlx_vlm.lora", "--model-path", repo, "--dataset", str(tmp), "--split", "train",
           "--batch-size", "1", "--steps", str(steps), "--learning-rate", str(args.lr), "--lora-rank", str(args.rank),
           "--lora-alpha", str(args.rank), "--apply-chat-template", "--output-path", str(OUT / "adapters.safetensors")]
    log("running:", " ".join(cmd))
    subprocess.run(cmd, check=True, timeout=args.minutes * 60 + 600)


# ---------------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Fine-tune the local AI on ./data (LoRA, ~30-45 minutes).")
    ap.add_argument("--minutes", type=float, default=40, help="time budget for the whole run (default 40)")
    ap.add_argument("--base", default=None, help="base model id (default: chosen from your GPU memory)")
    ap.add_argument("--epochs", type=float, default=3)
    ap.add_argument("--rank", type=int, default=16)
    ap.add_argument("--lr", type=float, default=2e-4)
    ap.add_argument("--batch", type=int, default=1)
    ap.add_argument("--accum", type=int, default=4)
    ap.add_argument("--max-len", dest="max_len", type=int, default=2048)
    args = ap.parse_args()
    t0 = time.time()

    from engine import detect_hardware
    hw = detect_hardware()
    if hw.backend == "cpu":
        sys.exit("Training needs an NVIDIA GPU (CUDA) or an Apple Silicon Mac.")
    base = pick_base(args, hw.backend, hw.total_gb)
    log(f"{hw.name}: {hw.total_gb:.1f} GB -> base model {base}")
    rows = collect(Transcriber(hw.backend))
    if not rows:
        sys.exit(f"No training examples found in {DATA}. See the top of train.py for the file formats.")
    random.Random(3407).shuffle(rows)
    log(f"{len(rows)} examples ({sum(1 for r in rows if r['image'])} with images) - data ready in {time.time() - t0:.0f}s")
    if hw.backend == "mlx":
        train_mlx(rows, base, args, t0)
    else:
        train_unsloth(rows, base, args, t0)
    save_meta(base, hw.backend, len(rows), (time.time() - t0) / 60)
    log(f"done in {(time.time() - t0) / 60:.1f} min. Adapter saved to {OUT} - restart the API (stop + start) to use it.")


if __name__ == "__main__":
    main()
