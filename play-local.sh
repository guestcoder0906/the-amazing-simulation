#!/usr/bin/env bash
# The Amazing Digital Circus on your own Mac or Linux computer, with Claude through your own Claude Code login (no API key).
# Everything it needs is set up automatically the first time: a private copy of Python (only if this computer has no working one),
# Anthropic's Claude Code, and Anthropic's own sign-in page. Ctrl+C (or closing the window) stops the game.
cd "$(dirname "$0")" || exit 1
PY=""
for c in python3 python; do
  p=$(command -v "$c" 2>/dev/null) || continue
  # a real Python 3 (on a Mac without Apple's developer tools, "python3" is only a stub that asks to install them)
  if "$p" -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >/dev/null 2>&1; then PY="$p"; break; fi
done
RT="$(pwd)/runtime/python"
if [ -z "$PY" ] && [ -x "$RT/bin/python3" ]; then PY="$RT/bin/python3"; fi
if [ -z "$PY" ]; then
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) T=aarch64-apple-darwin ;;
    Darwin-x86_64) T=x86_64-apple-darwin ;;
    Linux-x86_64) T=x86_64-unknown-linux-gnu ;;
    Linux-aarch64|Linux-arm64) T=aarch64-unknown-linux-gnu ;;
    *) echo "This computer ($(uname -s) $(uname -m)) needs Python 3: install it from https://www.python.org/downloads/ and run this again."; exit 1 ;;
  esac
  echo "Python is not set up on this computer: downloading a private copy just for the game (about 25 MB, first time only, nothing else changes)..."
  mkdir -p runtime
  if curl -fsSL "https://github.com/astral-sh/python-build-standalone/releases/download/20261026/cpython-3.12.16%2B20261026-$T-install_only.tar.gz" | tar -xz -C runtime; then PY="$RT/bin/python3"; fi
  if [ -z "$PY" ] || [ ! -x "$PY" ]; then echo "Could not set up Python automatically: install it from https://www.python.org/downloads/ and run this again."; exit 1; fi
fi
exec "$PY" local/server.py "$@"
