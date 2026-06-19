@echo off
rem WannaLog をダブルクリックで起動するショートカット
rem このファイルがあるフォルダの app/ に移動して、トンネルで起動します。
cd /d "%~dp0app"
echo WannaLog を起動します...（QRが出たら iPhone のカメラで読み込んでください）
npx expo start --tunnel
echo.
echo ※ウィンドウを閉じるとアプリの配信は止まります。
pause
