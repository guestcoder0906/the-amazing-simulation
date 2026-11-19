"""
tunnel.py - gives the local AI a public https address so the website works from any device (phone, tablet, other PCs)
while this computer runs the AI.

  * starts a Cloudflare quick tunnel (free, no account): https://<random>.trycloudflare.com -> http://127.0.0.1:8000
  * publishes the current address to a gist on your GitHub account (file ai-url.json), so the website can find it
    (the address changes every time the tunnel starts); uses the GitHub CLI you are signed in with (gh)
  * requests that come through the tunnel must carry your private access key (local-ai/.ai_key, made by start.bat),
    so nobody else can use your GPU. Open the website once on each device with ?key=YOUR_KEY (see DEVICE_LINK.txt).

Started and stopped by start.bat / stop.bat (or start.sh / stop.sh). Turn it off with LOCAL_AI_TUNNEL=0.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PORT = int(os.environ.get("LOCAL_AI_PORT", "8000"))
GIST_FILE = "ai-url.json"
GIST_DESC = "The Amazing Simulation - current local AI address"
STATE = HERE / ".tunnel.json"
URL_RX = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")


def log(*a):
    print("[tunnel]", *a, flush=True)


def find(exe: str, extra: list[str]) -> str | None:
    p = shutil.which(exe)
    if p:
        return p
    for c in extra:
        if os.path.exists(c):
            return c
    return None


CLOUDFLARED = find("cloudflared", [r"C:\Program Files (x86)\cloudflared\cloudflared.exe", r"C:\Program Files\cloudflared\cloudflared.exe",
                                   "/opt/homebrew/bin/cloudflared", "/usr/local/bin/cloudflared"])
GH = find("gh", [r"C:\Program Files\GitHub CLI\gh.exe", "/opt/homebrew/bin/gh", "/usr/local/bin/gh"])


def gh(*args: str, body: dict | None = None) -> dict | list | None:
    if not GH:
        return None
    cmd = [GH, "api", *args]
    tmp = None
    if body is not None:
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump(body, tmp)
        tmp.close()
        cmd += ["--input", tmp.name]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            log("gh api failed:", r.stderr.strip()[:300])
            return None
        return json.loads(r.stdout or "null")
    finally:
        if tmp:
            os.unlink(tmp.name)


def publish(url: str | None):
    """Write the current address into the gist (creating the gist the first time)."""
    content = json.dumps({"url": url, "updated": int(time.time())})
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    gid = state.get("gist_id")
    if gid:
        if gh("-X", "PATCH", f"gists/{gid}", body={"files": {GIST_FILE: {"content": content}}}) is not None:
            log("address published:", url)
            return
        gid = None
    # find an existing one (e.g. after cloning on another PC), else create it (public, so the website can list it)
    for g in gh("gists?per_page=100") or []:
        if GIST_FILE in (g.get("files") or {}) and g.get("description") == GIST_DESC:
            gid = g["id"]
            break
    if gid:
        gh("-X", "PATCH", f"gists/{gid}", body={"files": {GIST_FILE: {"content": content}}})
    else:
        g = gh("-X", "POST", "gists", body={"description": GIST_DESC, "public": True, "files": {GIST_FILE: {"content": content}}})
        gid = g and g.get("id")
    if gid:
        user = (gh("user") or {}).get("login", "")
        STATE.write_text(json.dumps({"gist_id": gid, "user": user}))
        log(f"address published: {url} (gist {gid}, user {user})")
    else:
        log("could not publish the address (is the GitHub CLI signed in? run: gh auth login)")


def main():
    if not CLOUDFLARED:
        sys.exit("cloudflared is not installed: Windows 'winget install Cloudflare.cloudflared', Mac 'brew install cloudflared'")
    p = subprocess.Popen([CLOUDFLARED, "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{PORT}"],
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    url = None
    try:
        for line in p.stdout:  # cloudflared prints the address once the tunnel is up, then keeps logging
            if not url:
                m = URL_RX.search(line)
                if m:
                    url = m.group(0)
                    (HERE / "tunnel_url.txt").write_text(url)
                    log("public address:", url)
                    publish(url)
                    try:  # quick self-check through the tunnel (DNS for a fresh name can take a few seconds)
                        for _ in range(10):
                            try:
                                with urllib.request.urlopen(url + "/health", timeout=10) as r:
                                    log("tunnel check:", r.status)
                                    break
                            except Exception:
                                time.sleep(3)
                    except Exception:
                        pass
        log("cloudflared exited with", p.wait())
    finally:
        try:
            p.terminate()
        except Exception:
            pass
        if url:
            publish(None)  # tell the website the AI is offline


if __name__ == "__main__":
    main()
