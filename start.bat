@echo off
rem Starts the local AI API (http://127.0.0.1:8000) in the background. First run sets everything up (can take a while).
setlocal
cd /d "%~dp0local-ai"
if exist api.pid (
  for /f %%p in (api.pid) do tasklist /FI "PID eq %%p" 2>nul | find "%%p" >nul && (echo Local AI is already running ^(PID %%p^). & goto :eof)
)
set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY where python >nul 2>nul && set PY=python
if defined PY %PY% --version >nul 2>nul || set PY=
if not defined PY (echo Python 3.10+ is needed: https://www.python.org/downloads/ & exit /b 1)
if not exist .venv\Scripts\python.exe (
  echo Creating the Python environment...
  %PY% -m venv .venv || exit /b 1
)
if not exist .venv\installed.ok (
  echo Installing PyTorch ^(CUDA 12.8^) and the AI packages - first run only...
  .venv\Scripts\python -m pip install --upgrade pip
  .venv\Scripts\python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128 || exit /b 1
  .venv\Scripts\python -m pip install -r requirements.txt || exit /b 1
  echo ok> .venv\installed.ok
)
powershell -NoProfile -Command "$p = Start-Process -FilePath '.venv\Scripts\python.exe' -ArgumentList 'api.py' -WindowStyle Hidden -RedirectStandardOutput 'api.out.log' -RedirectStandardError 'api.log' -PassThru; Set-Content -Path 'api.pid' -Value $p.Id -Encoding ascii; Write-Host ('Local AI started on http://127.0.0.1:8000 (PID ' + $p.Id + '). Logs: local-ai\api.log')"
endlocal
