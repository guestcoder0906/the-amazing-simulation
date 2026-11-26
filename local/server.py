"""
local/server.py - runs the whole game on your own computer, with Claude through YOUR Claude Code login (no API key).

  * serves the site exactly as Vercel does (index.html + public/, same security headers)
  * /api/claude: every Claude request of the game goes to the official Claude Code app on this computer (`claude -p`),
    signed in with your own Claude account through Anthropic's own sign-in (`claude auth login`). Your login never leaves
    Claude Code: this server only starts it and reads its answer. For your own use on this computer only.
  * /api/gemini: Gemini with YOUR Gemini key (the key button in the game saves it in your browser; or GEMINI_API_KEY here).
    Without a key it answers "not set up": listening then runs in the browser and Claude (Haiku) does the quick checks.

Start it with play-local.bat (Windows) or ./play-local.sh (Mac / Linux), or:  python local/server.py  [--port 8137]
Standard library only (Python 3.9+).
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
WORK = Path(tempfile.gettempdir()) / "amazing-sim-local"
WORK.mkdir(parents=True, exist_ok=True)
MODELS = {"claude-opus-5-5", "claude-haiku-5-5"}
MAX_PARALLEL = int(os.environ.get("SIM_LOCAL_PARALLEL", "4"))  # Claude Code processes at the same time
GATE = threading.Semaphore(MAX_PARALLEL)

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("text/plain; charset=utf-8", ".txt")


def log(*a):
    print("[local]", *a, flush=True)


# ---------------------------------------------------------------------------------------------- Claude Code
def find_claude() -> str | None:
    """The Claude Code command: CLAUDE_CLI, then `claude` on PATH, then the standard install places."""
    env = os.environ.get("CLAUDE_CLI")
    if env and Path(env).exists():
        return env
    for name in ("claude", "claude.exe", "claude.cmd"):
        p = shutil.which(name)
        if p:
            return p
    home = Path.home()
    cands = [home / ".local" / "bin" / ("claude.exe" if os.name == "nt" else "claude"), home / ".claude" / "local" / "claude"]
    for c in cands:
        if c.exists():
            return str(c)
    if os.name == "nt":  # the copy that comes with the Claude desktop app (newest version)
        found = glob.glob(str(Path(os.environ.get("LOCALAPPDATA", "")) / "Claude-Data" / "*" / "claude-code" / "*" / "*" / "claude.exe"))
        if found:
            return sorted(found, key=lambda p: Path(p).stat().st_mtime)[-1]
    return None


CLAUDE = None


def claude_env() -> dict:
    env = dict(os.environ)
    for k in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX"):
        env.pop(k, None)  # always your own Claude login, never a key that happens to be set on this computer
    env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1"
    return env


def login_status() -> dict:
    if not CLAUDE:
        return {"installed": False, "loggedIn": False}
    try:
        r = subprocess.run([CLAUDE, "auth", "status"], capture_output=True, text=True, timeout=30, env=claude_env())
        j = json.loads(r.stdout or "{}")
        return {"installed": True, "loggedIn": bool(j.get("loggedIn")), "authMethod": j.get("authMethod")}
    except Exception as e:
        return {"installed": True, "loggedIn": False, "error": str(e)}


# ---------------------------------------------------------------------------------------------- Messages request -> Claude Code
CODE_FIELDS = {"builder_code", "code", "source", "script", "js", "update", "init", "step"}

PROTOCOL = """TOOLS (this conversation uses these tools instead of any others). To call a tool, write a block exactly like this in your reply:
<tool_call>
{"name": "tool_name", "input": {"field": "value", "at": [1, 0, 2]}}
<arg name="code">
...the value of a long code / text field, as plain text (no JSON escaping)...
</arg>
</tool_call>
- Put every SHORT field in the JSON. Put each LONG code field (builder_code, code, and any multi-line JavaScript) in its own <arg name="field"> block after the JSON instead of inside it.
- Several <tool_call> blocks may go in one reply; they all run, in order. Write any text you want the user to see outside the blocks.
- After your tool calls, STOP your reply: the results come back to you as <tool_result> blocks in the next message, and you then continue.
- Never describe a call in words instead of making it; never invent a result.
The tools:
"""


def tool_list(tools: list) -> str:
    out = []
    for t in tools or []:
        if not isinstance(t, dict) or t.get("type") or not t.get("name"):
            continue
        schema = t.get("input_schema") or t.get("inputSchema") or {"type": "object", "properties": {}}
        out.append(f"\n## {t['name']}\n{str(t.get('description', '')).strip()}\ninput schema: {json.dumps(schema, ensure_ascii=False, separators=(',', ':'))}")
    return "".join(out)


def format_call(name: str, inp: dict) -> str:
    small, raw = {}, []
    for k, v in (inp or {}).items():
        if isinstance(v, str) and (k in CODE_FIELDS or (len(v) > 400 and "\n" in v)):
            raw.append((k, v))
        else:
            small[k] = v
    s = "<tool_call>\n" + json.dumps({"name": name, "input": small}, ensure_ascii=False)
    for k, v in raw:
        s += f'\n<arg name="{k}">\n{v}\n</arg>'
    return s + "\n</tool_call>"


def system_text(body: dict) -> str:
    sysv = body.get("system")
    if isinstance(sysv, list):
        sysv = "\n\n".join(b.get("text", "") for b in sysv if isinstance(b, dict))
    sysv = str(sysv or "You are a helpful assistant inside a live 3D sandbox game.")
    tl = tool_list(body.get("tools"))
    if tl:
        sysv += "\n\n" + PROTOCOL + tl
    return sysv


def image_block(b: dict) -> dict | None:
    src = b.get("source") or {}
    if src.get("type") == "base64" and src.get("data"):
        return {"type": "image", "source": {"type": "base64", "media_type": src.get("media_type", "image/png"), "data": src["data"]}}
    return None


def transcript(body: dict) -> list:
    """The whole conversation as ONE user turn for Claude Code (text + images, earlier replies and tool results marked)."""
    msgs = body.get("messages") or []
    blocks: list = []

    def text(t):
        if t:
            if blocks and blocks[-1]["type"] == "text":
                blocks[-1]["text"] += "\n" + t
            else:
                blocks.append({"type": "text", "text": t})

    names = {}
    multi = len(msgs) > 1
    if multi:
        text("THE CONVERSATION SO FAR (continue it as the assistant):")
    for m in msgs:
        role = m.get("role")
        content = m.get("content")
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        if multi:
            text("\n=== " + ("YOUR EARLIER REPLY" if role == "assistant" else "USER") + " ===")
        for b in content or []:
            if not isinstance(b, dict):
                continue
            t = b.get("type")
            if t == "text":
                text(b.get("text", ""))
            elif t == "image":
                ib = image_block(b)
                if ib:
                    blocks.append(ib)
            elif t == "tool_use":
                names[b.get("id")] = b.get("name")
                text(format_call(b.get("name", ""), b.get("input") or {}))
            elif t == "tool_result":
                c = b.get("content")
                parts = c if isinstance(c, list) else [{"type": "text", "text": str(c if c is not None else "")}]
                text(f'<tool_result name="{names.get(b.get("tool_use_id"), "")}">')
                for p in parts:
                    if isinstance(p, dict) and p.get("type") == "image":
                        ib = image_block(p)
                        if ib:
                            blocks.append(ib)
                    elif isinstance(p, dict):
                        text(p.get("text", ""))
                    else:
                        text(str(p))
                text("</tool_result>")
            # thinking / server tool blocks: not needed
    if multi:
        text("\n=== NOW ===\nWrite your next reply as the assistant (text and/or <tool_call> blocks).")
    if not blocks:
        blocks = [{"type": "text", "text": "(continue)"}]
    return blocks


TOOL_RX = re.compile(r"<tool_call>\s*(.*?)\s*(?:</tool_call>|$)", re.S)
ARG_RX = re.compile(r'<arg\s+name\s*=\s*"([A-Za-z_]\w*)"\s*>\n?(.*?)\n?</arg>', re.S)


def loads_lenient(s: str):
    s = s.strip().strip("`")
    if s.startswith("json"):
        s = s[4:]
    try:
        return json.loads(s)
    except Exception:
        i, j = s.find("{"), s.rfind("}")
        if i >= 0 and j > i:
            try:
                return json.loads(s[i:j + 1])
            except Exception:
                return None
    return None


def parse_reply(text: str, tools: list) -> list:
    names = {t.get("name") for t in tools or [] if isinstance(t, dict)}
    out, pos = [], 0
    for m in TOOL_RX.finditer(text):
        pre = text[pos:m.start()].strip()
        if pre:
            out.append({"type": "text", "text": pre})
        pos = m.end()
        bodytxt = m.group(1)
        raw = {a.group(1): a.group(2) for a in ARG_RX.finditer(bodytxt)}
        rest = ARG_RX.sub("", bodytxt)
        cut = re.search(r'<arg\s+name\s*=\s*"([A-Za-z_]\w*)"\s*>\n?', rest)
        if cut:  # an <arg> that was not closed (cut off): keep what was written
            raw.setdefault(cut.group(1), rest[cut.end():])
            rest = rest[: cut.start()]
        obj = loads_lenient(rest)
        if isinstance(obj, dict) and obj.get("name") in names:
            args = obj.get("input", obj.get("arguments", {}))
            if isinstance(args, str):
                args = loads_lenient(args) or {}
            args = dict(args or {})
            args.update(raw)
            out.append({"type": "tool_use", "id": "toolu_" + uuid.uuid4().hex[:24], "name": obj["name"], "input": args})
        else:
            out.append({"type": "text", "text": m.group(0)})
    tail = text[pos:].strip()
    if tail:
        out.append({"type": "text", "text": tail})
    return out or [{"type": "text", "text": ""}]


def run_claude(body: dict) -> tuple[int, dict]:
    if not CLAUDE:
        return 503, {"type": "error", "error": {"type": "not_installed", "message": "Claude Code is not installed on this computer: run play-local.bat again (it installs it)."}}
    model = str(body.get("model") or "claude-haiku-5-5")
    if model not in MODELS:
        model = "claude-haiku-5-5"
    sysv = system_text(body)
    sp = WORK / ("sys-" + hashlib.sha1(sysv.encode("utf-8")).hexdigest()[:16] + ".txt")
    if not sp.exists():
        sp.write_text(sysv, encoding="utf-8")
    web = any(isinstance(t, dict) and str(t.get("type", "")).startswith("web_search") for t in body.get("tools") or [])
    args = [CLAUDE, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--model", model,
            "--system-prompt-file", str(sp), "--tools", "WebSearch" if web else "", "--no-session-persistence",
            "--setting-sources", "", "--strict-mcp-config", "--max-turns", "4" if web else "1"]
    env = claude_env()
    env["CLAUDE_CODE_MAX_OUTPUT_TOKENS"] = str(max(4096, min(int(body.get("max_tokens") or 16000), 32000)))
    msg = {"type": "user", "message": {"role": "user", "content": transcript(body)}}
    t0 = time.time()
    with GATE:
        try:
            p = subprocess.run(args, input=json.dumps(msg, ensure_ascii=False) + "\n", capture_output=True, text=True, encoding="utf-8",
                               errors="replace", timeout=1500, env=env, cwd=str(WORK),
                               creationflags=(subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0))
        except subprocess.TimeoutExpired:
            return 504, {"type": "error", "error": {"type": "timeout", "message": "Claude Code took too long to answer"}}
    res, texts = None, []
    for line in (p.stdout or "").splitlines():
        try:
            ev = json.loads(line)
        except Exception:
            continue
        if ev.get("type") == "result":
            res = ev
        elif ev.get("type") == "assistant":
            for b in (ev.get("message") or {}).get("content") or []:
                if isinstance(b, dict) and b.get("type") == "text":
                    texts.append(b.get("text", ""))
    if not res:
        err = (p.stderr or p.stdout or "no answer")[-600:]
        log("Claude Code failed:", err)
        return 502, {"type": "error", "error": {"type": "api_error", "message": "Claude Code did not answer: " + err}}
    out = str(res.get("result") or "") or "\n".join(texts)
    if res.get("is_error"):
        low = out.lower()
        if "log in" in low or "login" in low or "logged in" in low:
            return 401, {"type": "error", "error": {"type": "not_logged_in", "message": "Claude Code is not signed in on this computer: run play-local.bat again (it opens Anthropic's sign-in)."}}
        if "limit" in low or "rate" in low or "overloaded" in low:
            return 429, {"type": "error", "error": {"type": "rate_limit_error", "message": out[:400]}}
        return 502, {"type": "error", "error": {"type": "api_error", "message": out[:400]}}
    u = res.get("usage") or {}
    content = parse_reply(out, body.get("tools"))
    stop = "tool_use" if any(b["type"] == "tool_use" for b in content) else "end_turn"
    log(f"{model}: {round(time.time() - t0, 1)} s, {u.get('output_tokens', 0)} tokens out, {sum(b['type'] == 'tool_use' for b in content)} tool calls")
    return 200, {"id": "msg_" + uuid.uuid4().hex[:24], "type": "message", "role": "assistant", "model": model, "content": content,
                 "stop_reason": stop, "stop_sequence": None,
                 "usage": {"input_tokens": int(u.get("input_tokens") or 0), "output_tokens": int(u.get("output_tokens") or 0),
                           "cache_creation_input_tokens": int(u.get("cache_creation_input_tokens") or 0),
                           "cache_read_input_tokens": int(u.get("cache_read_input_tokens") or 0)}}


# ---------------------------------------------------------------------------------------------- Gemini (your own key)
# The key comes from the game (key button, saved in your browser) with each request, or from GEMINI_API_KEY on this computer.
# Same conversion as api/gemini.ts (Messages format <-> Gemini), so the game code is unchanged. Without a key: 503, and the game
# listens in the browser and uses Claude for quick work instead.
import random as _random
import urllib.error
import urllib.request

GEM_DEFAULT = "gemini-3.5-flash-lite"
GEM_MODELS = {
    "gemini-3.5-flash-lite": {"levels": ["minimal", "low", "medium", "high"], "maxOut": 8192},
    "gemini-3.8-flash": {"levels": ["low", "medium", "high"], "maxOut": 32768},
    "gemini-4-hydrogen": {"levels": ["low", "medium", "high", "xhigh"], "maxOut": 32768},
}
GEM_BASE = "https://generativelanguage.googleapis.com/v1beta/"


def gem_level(model: str, want) -> str:
    lv = GEM_MODELS[model]["levels"]
    w = str(want or ("minimal" if model == GEM_DEFAULT else "medium")).lower()
    if w in lv:
        return w
    return lv[0] if w == "minimal" else "medium"


def to_gemini(body: dict, model: str) -> dict:
    names, contents = {}, []
    for m in body.get("messages") or []:
        c = m.get("content")
        blocks = [{"type": "text", "text": c}] if isinstance(c, str) else (c or [])
        parts = []
        for b in blocks:
            if not isinstance(b, dict):
                continue
            t, src = b.get("type"), b.get("source") or {}
            if t == "text":
                if str(b.get("text") or "").strip():
                    parts.append({"text": b["text"]})
            elif t in ("image", "audio") and src.get("data"):
                parts.append({"inlineData": {"mimeType": src.get("media_type") or ("image/jpeg" if t == "image" else "audio/wav"), "data": src["data"]}})
            elif t == "tool_use":
                names[b.get("id")] = b.get("name")
                p = {"functionCall": {"name": b.get("name"), "args": b.get("input") or {}}}
                if b.get("_gsig"):
                    p["thoughtSignature"] = b["_gsig"]
                parts.append(p)
            elif t == "tool_result":
                rc = b.get("content")
                txt = "\n".join(x.get("text", "") for x in rc if isinstance(x, dict)) if isinstance(rc, list) else str(rc if rc is not None else "")
                parts.append({"functionResponse": {"name": names.get(b.get("tool_use_id"), "tool"), "response": {"result": txt}}})
        if not parts:
            parts.append({"text": "(continue)"})
        role = "model" if m.get("role") == "assistant" else "user"
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"].extend(parts)
        else:
            contents.append({"role": role, "parts": parts})
    sysv = body.get("system")
    if isinstance(sysv, list):
        sysv = "\n".join(x.get("text", "") for x in sysv if isinstance(x, dict))
    req = {"contents": contents, "generationConfig": {"maxOutputTokens": min(int(body.get("max_tokens") or 4096), GEM_MODELS[model]["maxOut"]),
                                                       "thinkingConfig": {"thinkingLevel": gem_level(model, body.get("thinking"))}}}
    if sysv:
        req["systemInstruction"] = {"parts": [{"text": str(sysv)}]}
    tools = [t for t in body.get("tools") or [] if isinstance(t, dict) and t.get("name") and not t.get("type")]
    if tools:
        req["tools"] = [{"functionDeclarations": [{"name": t["name"], "description": str(t.get("description") or ""),
                                                    "parametersJsonSchema": t.get("input_schema") or {"type": "object", "properties": {}}} for t in tools]}]
        req["toolConfig"] = {"functionCallingConfig": {"mode": "AUTO"}}
    return req


def from_gemini(g: dict, model: str) -> dict:
    cand = (g.get("candidates") or [{}])[0] or {}
    content, calls = [], 0
    for p in (cand.get("content") or {}).get("parts") or []:
        if p.get("thought"):
            continue
        if isinstance(p.get("text"), str) and p["text"]:
            content.append({"type": "text", "text": p["text"]})
        elif p.get("functionCall"):
            calls += 1
            b = {"type": "tool_use", "id": "toolu_g" + uuid.uuid4().hex[:12], "name": p["functionCall"].get("name"), "input": p["functionCall"].get("args") or {}}
            if p.get("thoughtSignature"):
                b["_gsig"] = p["thoughtSignature"]
            content.append(b)
    if not content:
        content.append({"type": "text", "text": ""})
    u = g.get("usageMetadata") or {}
    return {"id": "msg_g" + uuid.uuid4().hex[:12], "type": "message", "role": "assistant", "model": model, "content": content,
            "stop_reason": "tool_use" if calls else ("max_tokens" if cand.get("finishReason") == "MAX_TOKENS" else "end_turn"), "stop_sequence": None,
            "usage": {"input_tokens": max(0, int(u.get("promptTokenCount") or 0) - int(u.get("cachedContentTokenCount") or 0)),
                      "output_tokens": int(u.get("candidatesTokenCount") or 0) + int(u.get("thoughtsTokenCount") or 0),
                      "cache_read_input_tokens": int(u.get("cachedContentTokenCount") or 0)}}


def gem_http(url: str, key: str, payload: dict | None = None, timeout: int = 120) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    rq = urllib.request.Request(url, data=data, method="POST" if data is not None else "GET",
                                headers={"content-type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(rq, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def gem_message(text: str) -> str:
    try:
        j = json.loads(text)
        if isinstance(j, list) and j:  # the Interactions API wraps its error in a list
            j = j[0]
        return j["error"]["message"]
    except Exception:
        return text[:400]


def gemini_check(key: str) -> dict:
    """Instant key check: lists the models with the key (costs nothing)."""
    key = (key or "").strip()
    if not key:
        return {"ok": False, "message": "no key given"}
    try:
        code, text = gem_http(GEM_BASE + "models?pageSize=1", key, None, timeout=20)
    except Exception as e:
        return {"ok": False, "message": "could not reach Gemini (" + str(e) + ")"}
    return {"ok": True} if code == 200 else {"ok": False, "message": gem_message(text) + f" ({code})"}


def run_gemini(body: dict, key: str) -> tuple[int, dict]:
    key = (key or os.environ.get("GEMINI_API_KEY") or "").strip()
    if not key:
        return 503, {"error": {"code": "not_granted", "message": "No Gemini key yet (key button, bottom left): listening runs in the browser and Claude answers quick work"}}
    try:
        if body.get("decision"):
            d = body["decision"]
            if d.get("type") == "choice" and isinstance(d.get("options"), dict) and len(d["options"]) >= 2:
                q = {"type": "choice", "instructions": str(d.get("question") or "")[:4000], "criteria": {str(k): str(v) for k, v in d["options"].items()}}
            else:
                q = {"type": "noul", "instructions": str(d.get("question") or "")[:4000]}
                if d.get("true_description") or d.get("false_description"):
                    q["criteria"] = {k: v for k, v in (("true_description", d.get("true_description")), ("false_description", d.get("false_description"))) if v}
            inp = str(d.get("input") or "")[:200000]
            if d.get("audio"):  # the clip itself: the decision model listens to it
                inp = ([{"type": "text", "text": inp}] if inp else []) + [{"type": "audio", "data": d["audio"], "mime_type": d.get("mime_type") or "audio/wav"}]
            elif not inp:
                inp = str(d.get("question") or "")
            code, text = gem_http(GEM_BASE + "decisions", key, {"model": "gemini-decision-1", "input": inp, "questions": {"q": q}}, timeout=60)
            if code != 200:
                return (429 if code == 429 else 410 if code == 404 else 529 if code >= 500 else code), {"error": {"code": "model_unavailable" if code == 404 else "api_error", "message": "Gemini decisions: " + gem_message(text)}}
            a = (json.loads(text).get("answers") or {}).get("q") or {}
            if q["type"] == "choice":
                return 200, {"model": "gemini-decision-1", "choice": a.get("choice"), "probabilities": a.get("probabilities") or {}, "confidence": float(a.get("confidence") or 0)}
            p = float(a.get("noul") or 0)
            return 200, {"model": "gemini-decision-1", "yes": p >= 0.5, "p": p, "confidence": float(a.get("confidence") or max(p, 1 - p))}
        if not isinstance(body.get("messages"), list) or not body["messages"]:
            return 400, {"error": {"code": "invalid_request", "message": "messages array is required"}}
        model = body.get("model") if body.get("model") in GEM_MODELS else GEM_DEFAULT
        payload = to_gemini(body, model)
        url = GEM_BASE + f"models/{model}:generateContent"
        started = time.time()
        code, text = gem_http(url, key, payload)
        for a in range(3):
            spent = code == 429 and re.search(r"quota|per day|billing|free.?tier|retry in \d+h", text, re.I)
            if code not in (429, 500, 503) or spent:
                break
            wait = 1.2 * 2 ** a
            if time.time() - started + wait > 40:
                break
            time.sleep(wait)
            code, text = gem_http(url, key, payload)
        if code != 200:
            return (429 if code == 429 else 410 if code == 404 else 529 if code >= 500 else code), {"error": {"code": "rate_limited" if code == 429 else "model_unavailable" if code == 404 else "api_error", "message": f"Gemini ({model}): " + gem_message(text)}}
        return 200, from_gemini(json.loads(text), model)
    except Exception as e:
        return 502, {"error": {"code": "api_error", "message": "Failed to reach Gemini: " + str(e)}}


def run_transcribe(body: dict, key: str) -> tuple[int, dict]:
    """Gemini 3.5 Transcribe (Interactions API): the words of a speech clip."""
    key = (key or os.environ.get("GEMINI_API_KEY") or "").strip()
    if not key:
        return 503, {"error": {"code": "not_granted", "message": "No Gemini key yet"}}
    if not body.get("audio"):
        return 400, {"error": {"code": "invalid_request", "message": "audio is required"}}
    req = {"model": "models/gemini-3.5-transcribe", "input": [{"type": "audio", "data": body["audio"], "mime_type": body.get("mime_type") or "audio/wav"}]}
    if body.get("language_codes"):
        req["generation_config"] = {"transcription_config": {"language_codes": list(body["language_codes"])}}
    try:
        code, text = gem_http(GEM_BASE + "interactions", key, req, timeout=120)
        if code != 200:
            return (429 if code == 429 else 410 if code == 404 else 529 if code >= 500 else code), {"error": {"code": "api_error", "message": "Gemini Transcribe: " + gem_message(text)}}
        j = json.loads(text)
        parts = [c.get("text", "") for s in j.get("steps") or [] for c in (s.get("content") or []) if isinstance(c, dict) and c.get("type") == "text"]
        if not parts:
            parts = [o.get("text", "") for o in j.get("outputs") or [] if isinstance(o, dict) and o.get("type") == "text"]
        return 200, {"model": "gemini-3.5-transcribe", "text": " ".join(p for p in parts if p).strip()}
    except Exception as e:
        return 502, {"error": {"code": "api_error", "message": "Failed to reach Gemini Transcribe: " + str(e)}}


# ---------------------------------------------------------------------------------------------- the web server
class Handler(BaseHTTPRequestHandler):
    server_version = "AmazingSimLocal/1"

    def log_message(self, fmt, *a):  # quiet: only errors and Claude calls are logged
        pass

    def _headers(self, code: int, ctype: str, n: int):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(n))
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "credentialless")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

    def _json(self, code: int, obj: dict):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._headers(code, "application/json", len(data))
        self.wfile.write(data)

    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/api/local-status":
            return self._json(200, {"local": True, **login_status()})
        if path in ("", "/", "/index.html"):
            html = (ROOT / "index.html").read_text(encoding="utf-8")
            html = html.replace("<head>", "<head><script>window.SIM_LOCAL = true;" + ("window.SIM_GEMINI_SERVER = true;" if os.environ.get("GEMINI_API_KEY") else "") + "</script>", 1)
            data = html.encode("utf-8")
            self._headers(200, "text/html; charset=utf-8", len(data))
            return self.wfile.write(data)
        rel = path.lstrip("/")
        for base in (PUBLIC, ROOT):
            f = (base / rel).resolve()
            try:
                f.relative_to(base.resolve())
            except ValueError:
                continue
            if f.is_file() and ".git" not in f.parts and "local-ai" not in f.parts:
                data = f.read_bytes()
                self._headers(200, mimetypes.guess_type(str(f))[0] or "application/octet-stream", len(data))
                return self.wfile.write(data)
        self._json(404, {"error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b""
        if path == "/api/claude":
            try:
                body = json.loads(raw or b"{}")
            except Exception:
                return self._json(400, {"type": "error", "error": {"type": "invalid_request_error", "message": "bad JSON"}})
            code, obj = run_claude(body)
            try:
                return self._json(code, obj)
            except (BrokenPipeError, ConnectionResetError):
                return None  # the page stopped waiting (Stop pressed)
        if path == "/api/gemini-transcribe":  # Gemini 3.5 Transcribe with your own key
            try:
                body = json.loads(raw or b"{}")
            except Exception:
                return self._json(400, {"error": {"code": "invalid_request", "message": "bad JSON"}})
            code, obj = run_transcribe(body, self.headers.get("x-gemini-key", ""))
            try:
                return self._json(code, obj)
            except (BrokenPipeError, ConnectionResetError):
                return None
        if path == "/api/gemini-check":  # the key dialog's instant check
            try:
                k = (json.loads(raw or b"{}") or {}).get("key", "")
            except Exception:
                k = ""
            return self._json(200, gemini_check(k))
        if path == "/api/gemini":  # Gemini with your own key (key button); without one: 503, the game listens in the browser
            try:
                body = json.loads(raw or b"{}")
            except Exception:
                return self._json(400, {"error": {"code": "invalid_request", "message": "bad JSON"}})
            code, obj = run_gemini(body, self.headers.get("x-gemini-key", ""))
            try:
                return self._json(code, obj)
            except (BrokenPipeError, ConnectionResetError):
                return None
        self._json(404, {"error": "not found"})


KEY_DIR = Path.home() / ".amazing-digital-circus"   # outside the game folder: kept when the game updates
KEY_FILE, ASKED_FILE = KEY_DIR / "gemini_key.txt", KEY_DIR / "gemini_asked.txt"


def gemini_setup():
    """Optional Gemini key, asked once at the first start (with the link to get one). With it, the characters really LISTEN (Gemini hears tone,
    emotion and music); without it the game uses its in-browser listener. The key is checked before it is saved, and it stays on this
    computer only (it is sent to Google's Gemini API and nowhere else)."""
    if os.environ.get("GEMINI_API_KEY"):
        return
    try:
        if KEY_FILE.exists():
            k = KEY_FILE.read_text(encoding="utf-8").strip()
            if k:
                os.environ["GEMINI_API_KEY"] = k
                return
        if ASKED_FILE.exists():
            return
    except OSError:
        return
    print()
    print("OPTIONAL - a free Gemini API key lets the characters really hear sounds and voices (tone, emotion, music).")
    print("  Get one here: https://aistudio.google.com/apikey  (sign in with Google, click 'Create API key', copy it)")
    for _ in range(3):
        try:
            k = input("  Paste your Gemini API key and press Enter (or just press Enter to skip for now): ").strip()
        except EOFError:
            k = ""
        if not k:
            print("  Skipped: the game uses its built-in listener. You can add a key later with the key button in the game.")
            print()
            break
        r = gemini_check(k)
        if r.get("ok"):
            try:
                KEY_DIR.mkdir(parents=True, exist_ok=True); KEY_FILE.write_text(k, encoding="utf-8")
            except OSError:
                pass
            os.environ["GEMINI_API_KEY"] = k
            print("  Gemini key works and is saved on this computer.")
            print()
            break
        print("  That key did not work: " + str(r.get("message", "")) + ". Try again, or press Enter to skip.")
    try:
        KEY_DIR.mkdir(parents=True, exist_ok=True); ASKED_FILE.write_text("asked", encoding="utf-8")
    except OSError:
        pass


def setup():
    """First run: install Claude Code (Anthropic's official installer) if it is missing, then sign in with Anthropic's own sign-in."""
    global CLAUDE
    CLAUDE = find_claude()
    if not CLAUDE:
        # the player chose to play this way, so it is set up without asking (Anthropic's official installer; no admin rights needed)
        print("Claude Code is not installed yet: installing it now with Anthropic's official installer (first time only)...", flush=True)
        if True:
            if os.name == "nt":
                subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm https://claude.ai/install.ps1 | iex"])
            else:
                subprocess.run(["bash", "-c", "curl -fsSL https://claude.ai/install.sh | bash"])
            CLAUDE = find_claude()
    if CLAUDE and not login_status().get("loggedIn"):
        print("\nSign in to your Claude account: Anthropic's sign-in page opens in your browser (your login stays inside Claude Code).\n", flush=True)
        subprocess.run([CLAUDE, "auth", "login"], env=claude_env())


def main():
    global CLAUDE
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("SIM_LOCAL_PORT", "8137")))
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--no-setup", action="store_true", help="do not offer to install Claude Code or sign in")
    a = ap.parse_args()
    if not a.no_setup:
        try:
            setup()
        except (EOFError, KeyboardInterrupt):
            pass
    try:
        gemini_setup()   # optional Gemini key: asked once (the saved key is loaded every start)
    except (EOFError, KeyboardInterrupt):
        pass
    CLAUDE = find_claude()
    st = login_status()
    if not CLAUDE:
        log("Claude Code was not found - install it (play-local.bat does) and start again.")
    elif not st.get("loggedIn"):
        log("Claude Code is not signed in yet - run:  claude auth login   (Anthropic's own sign-in), then start again.")
    else:
        log("Claude Code:", CLAUDE, "(signed in)")
    port = a.port
    for _ in range(20):
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            port += 1
    else:
        sys.exit("no free port")
    url = f"http://127.0.0.1:{port}/"
    log("The Amazing Digital Circus is running at", url, " (close this window to stop it)")
    if not a.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
