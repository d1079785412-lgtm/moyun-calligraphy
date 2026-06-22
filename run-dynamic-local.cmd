@echo off
cd /d "%~dp0"
title Moyun Dynamic Local

if not exist .env.local (
  echo .env.local was not found. Please configure your model key first.
  call "%~dp0setup-real-model.cmd"
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo Starting dynamic local version...
start "Moyun Dynamic Server" cmd /k "cd /d ""%~dp0"" && npm run dev -- --hostname 0.0.0.0 --port 3000"

echo Waiting for page...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(90); do { try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:3000'; exit 0 } } catch {}; Start-Sleep -Milliseconds 800 } while ((Get-Date) -lt $deadline); exit 1"

if errorlevel 1 (
  echo Page startup timed out. Please check the server window.
  pause
  exit /b 1
)

echo Page opened: http://127.0.0.1:3000
pause
