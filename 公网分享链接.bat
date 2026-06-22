@echo off
cd /d "%~dp0"
title 墨韵智创 公网分享链接

where npm >nul 2>nul
if errorlevel 1 (
  echo 没有找到 npm，请先安装 Node.js。
  pause
  exit /b 1
)

if not exist node_modules (
  echo 正在安装项目依赖，首次运行需要等待一会儿...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络或 npm 环境。
    pause
    exit /b 1
  )
)

echo 正在检查本地网页服务...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"
if errorlevel 1 (
  echo 正在启动本地服务...
  start "墨韵智创 Demo Server" cmd /k "cd /d ""%~dp0"" && npm run dev -- --hostname 0.0.0.0 --port 3000"
)

echo 正在等待本地网页加载完成...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(90); do { try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 800 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo 本地网页启动超时，请查看服务窗口是否有报错。
  pause
  exit /b 1
)

echo.
echo 即将生成公网临时链接。窗口中出现 https:// 开头的网址后，把它发给别人即可。
echo 注意：这个窗口和本地服务窗口都不能关闭。
echo 如果打开链接时出现 Tunnel Password 页面，请输入下面这个密码：
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -Uri 'https://loca.lt/mytunnelpassword' -UseBasicParsing -TimeoutSec 10).Content.Trim() } catch { Write-Host '密码获取失败，可稍后重试。' }"
echo.
call npx lt --port 3000 --local-host 127.0.0.1

pause
