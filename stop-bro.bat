@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-all-apis.ps1"
echo.
pause
