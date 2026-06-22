@echo off
cd /d "%~dp0"
title Deploy Moyun to Vercel

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

set VERCEL_TOKEN=

set /p VERCEL_EMAIL=Please enter your Vercel email: 
if "%VERCEL_EMAIL%"=="" (
  echo Email is required.
  pause
  exit /b 1
)

echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo Building project...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Logging in to Vercel. Please check your email and finish verification.
call npx --yes vercel login "%VERCEL_EMAIL%"
if errorlevel 1 (
  echo Vercel login failed.
  pause
  exit /b 1
)

echo Deploying to production...
call npx --yes vercel --prod

echo.
echo If deployment succeeded, copy the https://*.vercel.app link shown above.
pause
