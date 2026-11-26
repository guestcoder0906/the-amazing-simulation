@echo off
rem The Amazing Digital Circus on your own computer, with Claude through your own Claude Code login (no API key).
rem First run: offers to install Claude Code and opens Anthropic's sign-in. Close this window to stop the game.
cd /d "%~dp0"
title The Amazing Digital Circus (local)
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY (
  echo Python 3 is needed to run the game locally: https://www.python.org/downloads/
  pause
  exit /b 1
)
%PY% local\server.py %*
pause
