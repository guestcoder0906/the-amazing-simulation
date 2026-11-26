#!/usr/bin/env bash
# The Amazing Digital Circus on your own computer, with Claude through your own Claude Code login (no API key).
# The first run sets up what it needs (Anthropic's Claude Code and its sign-in page). Ctrl+C stops the game.
cd "$(dirname "$0")"
PY=$(command -v python3 || command -v python)
if [ -n "$PY" ] && ! "$PY" -c "import sys" >/dev/null 2>&1; then PY=""; fi
if [ -z "$PY" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    echo "Python 3 is needed. macOS will now offer to install Apple's command line tools (they include Python 3); run this again when that finishes."
    xcode-select --install 2>/dev/null || true
  else
    echo "Python 3 is needed: install it with your package manager (for example: sudo apt install python3) and run this again."
  fi
  exit 1
fi
exec "$PY" local/server.py "$@"
