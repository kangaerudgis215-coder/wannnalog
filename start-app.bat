@echo off
chcp 65001 >nul
title WannaLog 起動
cd /d "%~dp0"

echo ============================================
echo   WannaLog 起動ツール
echo ============================================
echo.
echo いまファイルがある場所:
echo   %cd%
echo.

rem --- 置き場所のチェック（app フォルダが隣にあるか）---
if not exist "app\package.json" (
  echo [！] このファイルは「正しいフォルダ」に置かれていません。
  echo.
  echo     start-app.bat は、app フォルダが「となり」にある場所に
  echo     置いてください（app や docs が一緒に見えるフォルダです）。
  echo.
  echo     いまの場所には app フォルダが見つかりませんでした。
  echo     ↑ このファイルを wannnalog フォルダの中へ移動してから、
  echo       もう一度ダブルクリックしてください。
  echo.
  echo     この画面は、キーを押すまで消えません。落ち着いて読んでください。
  echo.
  pause
  exit /b
)

rem --- git があれば最新版を取りこむ。無ければとばす ---
where git >nul 2>nul
if %errorlevel%==0 (
  echo [1/3] 最新版を取りこんでいます...
  git pull origin claude/upbeat-bohr-1y69a2
) else (
  echo [1/3] git が見つからないので、更新はとばして起動します。
)
echo.

cd app

echo [2/3] 必要な部品を確認しています（初回や更新時だけ時間がかかります）...
call npm install
echo.

echo [3/3] アプリを起動します。
echo   QRコードが出たら、iPhone のカメラで読んでください（Expo Go で開きます）。
echo.
call npx expo start --tunnel

echo.
echo ※ 終了しました。この画面はキーを押すまで開いたままにしています。
pause
