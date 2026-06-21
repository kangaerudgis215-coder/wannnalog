@echo off
cd /d "%~dp0app"
echo ============================================
echo   WannaLog launcher
echo ============================================
echo.
echo [1/3] Updating to the latest version...
git pull origin claude/upbeat-bohr-1y69a2
echo.
echo [2/3] Checking parts (first run / updates take a few minutes)...
call npm install
echo.
echo [3/3] Starting the app.
echo   When a QR code appears, scan it with your iPhone camera (Expo Go).
echo.
call npx expo start --tunnel
echo.
echo ----- Stopped. This window stays open. Press any key to close. -----
pause
