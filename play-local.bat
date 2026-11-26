@echo off
rem The Amazing Digital Circus on your own computer, with Claude through your own Claude Code login (no API key).
rem Everything it needs is set up automatically the first time: a private copy of Python (only if you have none), Anthropic's Claude Code,
rem and Anthropic's own sign-in page. Close this window to stop the game.
cd /d "%~dp0"
title The Amazing Digital Circus (local)
set "PY="
set "PYEXE="
rem a real Python (the Microsoft Store "python" shortcut only opens the Store, so each one is tested before it is used)
py -3 -c "import sys" >nul 2>&1 && set "PY=py -3"
if not defined PY python -c "import sys" >nul 2>&1 && set "PY=python"
if not defined PY if exist "%~dp0runtime\python\python.exe" set "PYEXE=%~dp0runtime\python\python.exe"
if not defined PY if not defined PYEXE (
  echo Python is not installed: downloading a private copy just for the game ^(about 11 MB, first time only, nothing else on your PC changes^)...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $a = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }; $d = Join-Path '%~dp0' 'runtime\python'; New-Item -ItemType Directory -Force $d | Out-Null; $z = Join-Path $d 'py.zip'; Invoke-WebRequest ('https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-' + $a + '.zip') -OutFile $z -UseBasicParsing; Expand-Archive $z -DestinationPath $d -Force; Remove-Item $z"
  if exist "%~dp0runtime\python\python.exe" set "PYEXE=%~dp0runtime\python\python.exe"
)
if not defined PY if not defined PYEXE (
  echo Could not set up Python automatically. Install it from https://www.python.org/downloads/ and run this again.
  pause
  exit /b 1
)
if defined PYEXE ("%PYEXE%" "%~dp0local\server.py" %*) else (%PY% "%~dp0local\server.py" %*)
pause
