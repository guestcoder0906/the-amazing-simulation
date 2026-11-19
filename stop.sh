#!/usr/bin/env bash
# Stops the local AI API started by start.sh (frees all GPU / unified memory).
cd "$(dirname "$0")/local-ai"
if [ -f api.pid ] && kill "$(cat api.pid)" 2>/dev/null; then echo "Local AI stopped (PID $(cat api.pid))."; else echo "Local AI is not running."; fi
rm -f api.pid
