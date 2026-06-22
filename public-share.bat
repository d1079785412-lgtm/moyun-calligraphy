@echo off
cd /d "%~dp0"
title Moyun Public Share

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies. This may take a while on first run...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Checking local web server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"
if errorlevel 1 (
  echo Starting local web server...
  start "Moyun Demo Server" cmd /k "cd /d ""%~dp0"" && npm run dev -- --hostname 0.0.0.0 --port 3000"
)

echo Waiting for local web page...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(90); do { try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 800 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo Local web page timed out. Please check the server window.
  pause
  exit /b 1
)

echo.
echo Creating public link...
echo Copy the URL that starts with https:// and ends with trycloudflare.com
echo Keep this window and the server window open.
echo.
call npx cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2 --edge-ip-version 4

pause
