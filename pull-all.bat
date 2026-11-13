@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pull-all.ps1" %*
echo.
pause
