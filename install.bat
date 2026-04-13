@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "APP_NAME=OSA Midnight Oil"
set "REPO_ROOT=%~dp0"

echo.
echo [ROS] Starting %APP_NAME% installer
echo [ROS] Repository: %REPO_ROOT%

where node >nul 2>nul
if %errorlevel% neq 0 (
  where winget >nul 2>nul
  if %errorlevel% equ 0 (
    echo [ROS] Installing Node.js LTS with winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  ) else (
    where choco >nul 2>nul
    if %errorlevel% equ 0 (
      echo [ROS] Installing Node.js LTS with Chocolatey...
      choco install nodejs-lts -y
    ) else (
      echo [ROS][warn] Node.js was not found and neither winget nor Chocolatey is available.
      echo [ROS][warn] Install Node.js 18+ manually from https://nodejs.org/ and rerun this script.
      exit /b 1
    )
  )
)

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ROS][warn] Node.js is still unavailable after install attempt. Open a new terminal and rerun.
  exit /b 1
)

echo [ROS] Node version:
node --version
echo [ROS] npm version:
npm --version

where rustup >nul 2>nul
if %errorlevel% neq 0 (
  echo [ROS] Installing Rust toolchain...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe"
  rustup-init.exe -y
  del /f /q rustup-init.exe >nul 2>nul
)

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\cargo.exe" (
  set "PATH=%CARGO_BIN%;%PATH%"
  echo [ROS] Installing wasm-pack (optional build helper)...
  "%CARGO_BIN%\cargo.exe" install wasm-pack
) else (
  echo [ROS][warn] Cargo was not found after rustup install. Skipping wasm-pack.
)

cd /d "%REPO_ROOT%"

echo [ROS] Installing project dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [ROS] Running production build...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [ROS] Install complete.
echo.
echo Next steps:
echo   1. Start the app locally with: npm run dev
echo   2. Open the printed local URL in your browser
echo   3. Create or unlock your master-locked workspace
echo.
echo Notes:
echo   - wasm-pack is optional. If unavailable, the Vite build still completes.
echo   - This installer sets up a local development/build environment only.
echo.
pause
