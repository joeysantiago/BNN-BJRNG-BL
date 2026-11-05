@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0commit-push-all.ps1" %*
echo.
pause
