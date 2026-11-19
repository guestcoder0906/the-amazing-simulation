#!/usr/bin/env bash
# Starts the local AI API (http://127.0.0.1:8000) in the background. First run sets everything up.
set -e
cd "$(dirname "$0")/local-ai"
if [ -f api.pid ] && kill -0 "$(cat api.pid)" 2>/dev/null; then echo "Local AI is already running (PID $(cat api.pid))."; exit 0; fi
PY=$(command -v python3 || command -v python) || { echo "Python 3.10+ is needed"; exit 1; }
[ -x .venv/bin/python ] || "$PY" -m venv .venv
if [ ! -f .venv/installed.ok ]; then
  echo "Installing the AI packages (first run only)..."
  .venv/bin/python -m pip install --upgrade pip
  if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
    .venv/bin/python -m pip install -r requirements-mac.txt
  else
    .venv/bin/python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
    .venv/bin/python -m pip install -r requirements.txt
  fi
  touch .venv/installed.ok
fi
nohup .venv/bin/python api.py > api.out.log 2> api.log &
echo $! > api.pid
echo "Local AI started on http://127.0.0.1:8000 (PID $(cat api.pid)). Logs: local-ai/api.log"
