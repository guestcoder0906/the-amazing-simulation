@echo off
rem Stops the local AI API started by start.bat (frees all GPU memory).
cd /d "%~dp0local-ai"
if not exist api.pid (echo Local AI is not running. & goto :eof)
for /f %%p in (api.pid) do taskkill /PID %%p /T /F >nul 2>nul && echo Local AI stopped ^(PID %%p^). || echo Local AI was not running.
del api.pid >nul 2>nul
