@echo off
cd /d "%~dp0"
title Deploy Moyun to Vercel

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

echo Installing dependencies if needed...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo Building project before deploy...
call npm run build
if errorlevel 1 (
  echo Build failed. Please fix the error above first.
  pause
  exit /b 1
)

echo.
echo Vercel login will open a browser or ask for your email.
echo After login, choose the default options unless you need to change the project name.
echo.
set VERCEL_TOKEN=
call npx --yes vercel logout
call npx --yes vercel login
if errorlevel 1 (
  echo Vercel login failed.
  pause
  exit /b 1
)

call npx --yes vercel --prod

echo.
echo If deployment succeeded, copy the https:// link shown above.
pause
