@echo off
cd /d "%~dp0"
title Setup Real Model Key

echo Choose text model provider:
echo 1. DeepSeek
echo 2. Qwen / Tongyi Qianwen
echo.
set /p PROVIDER_CHOICE=Enter 1 or 2: 

if "%PROVIDER_CHOICE%"=="1" (
  set TEXT_PROVIDER=deepseek
  set TEXT_BASE_URL=https://api.deepseek.com
  set TEXT_MODEL=deepseek-chat
) else if "%PROVIDER_CHOICE%"=="2" (
  set TEXT_PROVIDER=qwen
  set TEXT_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
  set TEXT_MODEL=qwen-plus
) else (
  echo Invalid choice.
  pause
  exit /b 1
)

echo.
set /p TEXT_KEY=Paste your API Key here, then press Enter: 
if "%TEXT_KEY%"=="" (
  echo API Key is required.
  pause
  exit /b 1
)

(
  echo TEXT_MODEL_PROVIDER=%TEXT_PROVIDER%
  echo TEXT_MODEL_API_KEY=%TEXT_KEY%
  echo TEXT_MODEL_BASE_URL=%TEXT_BASE_URL%
  echo TEXT_MODEL_NAME=%TEXT_MODEL%
  echo.
  echo IMAGE_MODEL_PROVIDER=mock
  echo IMAGE_MODEL_API_KEY=
  echo IMAGE_MODEL_BASE_URL=
  echo IMAGE_MODEL_NAME=
  echo.
  echo DATABASE_PATH=./data/calligraphy.sqlite
) > .env.local

echo.
echo Done. Real text model has been configured in .env.local
echo You can now run open-local.cmd or npm run dev.
pause
