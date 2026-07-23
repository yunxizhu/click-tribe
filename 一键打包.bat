@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ================================
echo   点击部落 - 一键打包 (Electron)
echo ================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 npm，请先安装 Node.js：https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\electron-packager" (
  echo [提示] 依赖未安装，正在执行 npm install …
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [错误] npm install 失败
    pause
    exit /b 1
  )
  echo.
)

echo [打包中] 请稍候，首次可能较慢…
echo.
call npm run pack
if errorlevel 1 (
  echo.
  echo [错误] 打包失败，请查看上方日志
  pause
  exit /b 1
)

echo.
echo [完成] 输出目录：
echo   %~dp0output\点击部落-win32-x64\
echo.

if exist "%~dp0output\点击部落-win32-x64" (
  explorer "%~dp0output\点击部落-win32-x64"
)

pause
