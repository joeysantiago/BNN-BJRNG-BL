@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-app.ps1" %*
echo.
pause
