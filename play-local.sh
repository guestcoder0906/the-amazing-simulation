#!/usr/bin/env bash
# The Amazing Digital Circus on your own computer, with Claude through your own Claude Code login (no API key).
# First run: offers to install Claude Code and opens Anthropic's sign-in. Ctrl+C stops the game.
cd "$(dirname "$0")"
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then echo "Python 3 is needed to run the game locally: https://www.python.org/downloads/"; exit 1; fi
exec "$PY" local/server.py "$@"
