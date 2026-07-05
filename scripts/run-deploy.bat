@echo off
REM Double-click to build and deploy Cuty Expenses to your VPS (expenses.cuty.center).
REM You will be asked for: VPS host, SSH user, paths on server. SSH password is asked once during upload/deploy.

cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0build-and-deploy-to-vps.ps1"
if errorlevel 1 (
    echo.
    echo Deploy failed. Check the messages above.
) else (
    echo.
    echo Done.
)
echo.
pause
