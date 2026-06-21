@echo off
cd /d "%~dp0app"
echo ============================================
echo   WannaLog launcher
echo ============================================
echo.
echo [1/4] Updating to the latest version...
git pull origin claude/upbeat-bohr-1y69a2
echo.
echo [2/4] Checking parts (first run / updates take a few minutes)...
call npm install
echo.
echo [3/4] Setting up tunnel (ngrok)...
call npm install -g @expo/ngrok
echo.
echo [4/4] Starting the app.
echo   When a QR code appears, scan it with your iPhone camera (Expo Go).
echo.
call npx expo start --tunnel
echo.
echo ----- Stopped. This window stays open. Press any key to close. -----
pause
