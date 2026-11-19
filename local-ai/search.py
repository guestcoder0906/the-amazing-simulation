"""
search.py - live web context for the local AI (DuckDuckGo via the `ddgs` package, no API key).

web_context(query) returns a short block of fresh search results that engine.py injects into the system prompt
whenever a request is sent with use_web_search=true. Failures never break a request: they return "".
"""
from __future__ import annotations

import datetime as _dt
import re
import sys

MAX_RESULTS = 6


def _clean_query(q: str) -> str:
    q = re.sub(r"<[^>]+>", " ", q or "")          # tags from tool protocol
    q = re.sub(r"\s+", " ", q).strip()
    return q[:300]


def search(query: str, max_results: int = MAX_RESULTS) -> list[dict]:
    q = _clean_query(query)
    if not q:
        return []
    try:
        from ddgs import DDGS
    except ImportError:  # older package name
        from duckduckgo_search import DDGS
    try:
        with DDGS() as d:
            return list(d.text(q, max_results=max_results)) or []
    except Exception as e:
        print("[search] failed:", e, file=sys.stderr)
        return []


def web_context(query: str, max_results: int = MAX_RESULTS) -> str:
    rows = search(query, max_results)
    if not rows:
        return ""
    today = _dt.date.today().isoformat()
    lines = [f"LIVE WEB SEARCH RESULTS (fetched {today} for: {_clean_query(query)[:120]!r}). Use them when they help; "
             "they may be incomplete, so prefer what several sources agree on and mention the source when it matters."]
    for i, r in enumerate(rows, 1):
        title = (r.get("title") or "").strip()
        body = (r.get("body") or r.get("snippet") or "").strip()
        href = (r.get("href") or r.get("url") or "").strip()
        lines.append(f"[{i}] {title}\n{body}\nSource: {href}")
    return "\n\n".join(lines)


if __name__ == "__main__":
    print(web_context(" ".join(sys.argv[1:]) or "latest news"))
