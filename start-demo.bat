@echo off
cd /d "%~dp0"
title 墨韵智创 Demo 启动器

where npm >nul 2>nul
if errorlevel 1 (
  echo 没有找到 npm，请先安装 Node.js。
  pause
  exit /b 1
)

if not exist node_modules (
  echo 正在安装依赖，首次运行需要等待一会儿...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络或 npm 环境。
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"
if errorlevel 1 (
  echo 正在启动本地服务...
  start "墨韵智创 Demo Server" cmd /k "cd /d ""%~dp0"" && npm run dev -- --hostname 0.0.0.0 --port 3000"
) else (
  echo 本地服务已经在运行。
)

echo 正在等待网页加载完成...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(90); do { try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 800 } while ((Get-Date) -lt $deadline); exit 1"

if errorlevel 1 (
  echo 网页启动超时，请查看打开的服务窗口是否有报错。
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process 'http://127.0.0.1:3000'"
echo 已打开网页：http://127.0.0.1:3000
echo.
echo 如果同学和你连接同一个 WiFi，可以把下面这个链接发给他们：
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress); if ($ip) { Write-Host ('http://' + $ip + ':3000') } else { Write-Host '没有自动识别到局域网 IP，请运行 ipconfig 查看 IPv4 地址。' }"
echo.
pause
