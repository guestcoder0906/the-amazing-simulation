"""
promptfit.py - makes every request as small and fast as possible without changing what the model is told.

1. Lossless compaction (always): collapse runs of spaces / blank lines, drop exact duplicate paragraphs that appear
   more than once in the prompt (the game re-sends the same long instructions every step), compact tool schemas.
   The model sees exactly the same information, in fewer tokens.
2. Task routing ("thinking"): quick tasks (moving, looking, talking, idle reactions) answer directly with a small
   output budget; big tasks (building, 3D modeling, coding, multi-step plans) get a private planning step inside
   <think>...</think> that is removed from the reply before the game sees it.
3. Fit to the GPU (only when a prompt still would not fit, which would otherwise fail): trims the least important
   material first - the oldest tool results and oldest chat turns - and never the instructions, the tool list or
   the newest request.
"""
from __future__ import annotations

import json
import os
import re

# ---------------------------------------------------------------------------------------------- 1. lossless compaction
_WS = re.compile(r"[ \t]+")
_BLANKS = re.compile(r"\n\s*\n\s*\n+")


def squeeze(text: str) -> str:
    if not text:
        return text
    lines = [(_WS.sub(" ", ln)).rstrip() for ln in text.split("\n")]
    return _BLANKS.sub("\n\n", "\n".join(lines)).strip()


def dedupe_paragraphs(texts: list[str], min_len: int = 160) -> list[str]:
    """Remove a paragraph if exactly the same long paragraph already appeared EARLIER in the prompt (keeps the first)."""
    seen: set[str] = set()
    out = []
    for t in texts:
        paras = t.split("\n\n")
        kept = []
        for p in paras:
            key = p.strip()
            if len(key) >= min_len:
                if key in seen:
                    continue
                seen.add(key)
            kept.append(p)
        out.append("\n\n".join(kept))
    return out


def compact_tools(tools: list[dict]) -> list[dict]:
    out = []
    for t in tools or []:
        t = dict(t)
        t["description"] = squeeze(str(t.get("description", "")))
        out.append(t)
    return out


def compact_messages(msgs: list[dict]) -> list[dict]:
    """msgs: engine format [{'role', 'content': [{'type': 'text'|'image'|'audio', ...}]}]."""
    texts, where = [], []
    for i, m in enumerate(msgs):
        for j, c in enumerate(m["content"]):
            if c["type"] == "text":
                texts.append(squeeze(c.get("text", "")))
                where.append((i, j))
    texts = dedupe_paragraphs(texts)
    out = [{"role": m["role"], "content": [dict(c) for c in m["content"]]} for m in msgs]
    for (i, j), t in zip(where, texts):
        out[i]["content"][j]["text"] = t
    return out


# ---------------------------------------------------------------------------------------------- 2. task routing
HEAVY_TOOLS = re.compile(r"^(run_code|create_|spawn_|edit_|build|make_|sculpt|model|animate|compose|audio|create_system|"
                         r"write_|code|script|character|asset|world|texture|material)", re.I)
HEAVY_WORDS = re.compile(r"\b(build|create|make|design|model|sculpt|3d|mesh|rig|animate|animation|code|script|program|"
                         r"function|system|mechanic|game|level|world|character|machine|vehicle|compose|song|music|"
                         r"refactor|debug|algorithm|plan|step by step)\b", re.I)


def classify(msgs: list[dict], tools: list[dict], model_hint: str = "") -> str:
    """'heavy' (think first) or 'light' (answer straight away)."""
    if "quick" in model_hint or "haiku" in model_hint:
        return "light"
    names = [str(t.get("name", "")) for t in tools or []]
    heavy_tool = any(HEAVY_TOOLS.match(n) for n in names if n not in ("build",)) or "run_code" in names
    last_user = ""
    for m in reversed(msgs):
        if m["role"] == "user":
            last_user = " ".join(c.get("text", "") for c in m["content"] if c["type"] == "text")
            break
    asks_heavy = len(HEAVY_WORDS.findall(last_user[-3000:])) >= 2
    if heavy_tool:  # the builder's toolset (code, assets, characters...)
        return "heavy"
    if asks_heavy and len(last_user) > 400:
        return "heavy"
    return "light"


THINK_INSTRUCTION = ("This is a big task. Before your answer, think it through privately inside <think>...</think>: what is "
                     "being asked, the parts it needs, the order of steps, and how you will check the result. Keep the "
                     "thinking focused. Then, after </think>, give your answer and/or tool calls. Only what comes after "
                     "</think> is used.")
LIGHT_INSTRUCTION = "Answer directly and briefly, or call the needed tool(s) straight away. Do not explain your reasoning."
THINK_RX = re.compile(r"<think>.*?</think>\s*", re.S | re.I)


def strip_thinking(text: str) -> str:
    text = THINK_RX.sub("", text)
    if "<think>" in text.lower() and "</think>" not in text.lower():  # ran out of tokens while thinking: keep nothing of it
        text = text[: text.lower().find("<think>")]
    return text.strip()


def settings_for(kind: str, requested_max: int, temperature: float | None):
    if kind == "light":
        return {"max_tokens": min(requested_max, 512), "temperature": 0.5 if temperature is None else temperature}
    return {"max_tokens": min(max(requested_max, 2048), 4096), "temperature": 0.6 if temperature is None else temperature}


# ---------------------------------------------------------------------------------------------- 3. fit to the GPU
def estimate_tokens(text: str) -> int:
    return int(len(text) / 3.6) + 1  # good average for English + JSON with Qwen's tokenizer


def default_budget(total_vram_gb: float) -> int:
    env = os.environ.get("LOCAL_AI_MAX_PROMPT_TOKENS")
    if env:
        return int(env)
    if total_vram_gb >= 22:
        return 24000
    if total_vram_gb >= 15:
        return 12000
    if total_vram_gb >= 11:
        return 7000
    return 3800  # 8 GB cards: what Qwen2.5-Omni-7B 4-bit reads quickly without overflowing into shared memory


def fit(system: str, msgs: list[dict], budget: int) -> tuple[list[dict], dict]:
    """Trim oldest tool results, then oldest turns, until the prompt fits. Never touches the system text (instructions
    + tools) or the newest user message. Returns (messages, report)."""
    def size():
        return estimate_tokens(system) + sum(estimate_tokens(c.get("text", "")) + (700 if c["type"] == "image" else 0)
                                             for m in msgs for c in m["content"])
    report = {"before": size(), "trimmed_results": 0, "dropped_turns": 0}
    if report["before"] <= budget:
        report["after"] = report["before"]
        return msgs, report
    msgs = [{"role": m["role"], "content": [dict(c) for c in m["content"]]} for m in msgs]
    last = len(msgs) - 1
    # a) shorten old tool results (keep the head and the tail, which carry the outcome)
    for i in range(0, last):
        for c in msgs[i]["content"]:
            t = c.get("text", "")
            if c["type"] == "text" and t.startswith("<tool_result>") and len(t) > 1200:
                c["text"] = t[:600] + "\n...(older tool output shortened)...\n" + t[-400:]
                report["trimmed_results"] += 1
        if size() <= budget:
            break
    # b) drop the oldest turns (but keep the first message when it is the long instructions, and the newest)
    start = 1 if msgs and len(" ".join(c.get("text", "") for c in msgs[0]["content"])) > 2000 else 0
    while size() > budget and len(msgs) - start > 2:
        msgs.pop(start)
        report["dropped_turns"] += 1
    if msgs and msgs[0]["role"] != "user":
        msgs.insert(0, {"role": "user", "content": [{"type": "text", "text": "(earlier conversation omitted)"}]})
    report["after"] = size()
    return msgs, report
