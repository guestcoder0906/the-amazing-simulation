@echo off
rem Stops the local AI API started by start.bat (frees all GPU memory).
cd /d "%~dp0local-ai"
if exist tunnel.pid (for /f %%p in (tunnel.pid) do taskkill /PID %%p /T /F >nul 2>nul) & del tunnel.pid >nul 2>nul & del tunnel_url.txt >nul 2>nul
if not exist api.pid (echo Local AI is not running. & goto :eof)
for /f %%p in (api.pid) do taskkill /PID %%p /T /F >nul 2>nul && echo Local AI stopped ^(PID %%p^). || echo Local AI was not running.
del api.pid >nul 2>nul
