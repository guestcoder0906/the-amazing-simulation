@echo off
rem Starts the local AI API (http://127.0.0.1:8000) in the background. First run sets everything up (can take a while).
rem The Python environment lives in a short path (%LOCALAPPDATA%\AmazingSimAI\venv) so Windows' 260-character path
rem limit never breaks package installs, wherever this project folder is. Override with LOCAL_AI_VENV.
setlocal
cd /d "%~dp0local-ai"
if not defined LOCAL_AI_VENV set "LOCAL_AI_VENV=%LOCALAPPDATA%\AmazingSimAI\venv"
set "VPY=%LOCAL_AI_VENV%\Scripts\python.exe"
if exist api.pid (
  for /f %%p in (api.pid) do tasklist /FI "PID eq %%p" 2>nul | find "%%p" >nul && (echo Local AI is already running ^(PID %%p^). & goto :eof)
)
set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY where python >nul 2>nul && set PY=python
if defined PY %PY% --version >nul 2>nul || set PY=
if not defined PY (echo Python 3.10+ is needed: https://www.python.org/downloads/ & exit /b 1)
if not exist "%VPY%" (
  echo Creating the Python environment in %LOCAL_AI_VENV% ...
  %PY% -m venv "%LOCAL_AI_VENV%" || exit /b 1
)
if not exist "%LOCAL_AI_VENV%\installed.ok" (
  echo Installing PyTorch ^(CUDA 12.8^) and the AI packages - first run only...
  "%VPY%" -m pip install --upgrade pip
  "%VPY%" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128 || exit /b 1
  "%VPY%" -m pip install -r requirements.txt || exit /b 1
  echo ok> "%LOCAL_AI_VENV%\installed.ok"
)
powershell -NoProfile -Command "$p = Start-Process -FilePath $env:VPY -ArgumentList 'api.py' -WindowStyle Hidden -RedirectStandardOutput 'api.out.log' -RedirectStandardError 'api.log' -PassThru; Set-Content -Path 'api.pid' -Value $p.Id -Encoding ascii; Write-Host ('Local AI started on http://127.0.0.1:8000 (PID ' + $p.Id + '). Logs: local-ai\api.log')"
endlocal
