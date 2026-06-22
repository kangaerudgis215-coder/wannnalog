@echo off
cd /d "%~dp0app"
echo ============================================
echo   WannaLog launcher (Wi-Fi mode)
echo ============================================
echo.
echo [1/3] Updating to the latest version...
git pull origin claude/upbeat-bohr-1y69a2
echo.
echo [2/3] Checking parts (first run / updates take a few minutes)...
call npm install
echo.
echo [3/3] Starting the app.
echo   - Keep your iPhone and this PC on the SAME Wi-Fi.
echo   - If it times out on the phone, turn Windows Firewall OFF and retry.
echo   When a QR code appears, scan it with your iPhone camera (Expo Go).
echo.
call npx expo start
echo.
echo ----- Stopped. This window stays open. Press any key to close. -----
pause
