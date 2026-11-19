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
[ -f .ai_key ] || .venv/bin/python -c "import secrets;open('.ai_key','w').write(secrets.token_hex(16))"
nohup .venv/bin/python api.py > api.out.log 2> api.log &
echo $! > api.pid
echo "Local AI started on http://127.0.0.1:8000 (PID $(cat api.pid)). Logs: local-ai/api.log"
if [ "${LOCAL_AI_TUNNEL:-1}" != "0" ]; then
  nohup .venv/bin/python tunnel.py > tunnel.log 2>&1 &
  echo $! > tunnel.pid
  printf 'Open this once on each device to use your local AI from anywhere (keep it private):
%s/?key=%s
' "${LOCAL_AI_SITE:-https://YOUR-SITE.vercel.app}" "$(cat .ai_key)" > DEVICE_LINK.txt
  echo "Public tunnel starting. Device link: local-ai/DEVICE_LINK.txt"
fi
