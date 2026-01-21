@echo off
REM LimeOS Auto-Install Rollout Script for Windows
REM Detects Windows and installs dependencies for the LimeOS React application

echo 🌿 LimeOS Auto-Install Rollout 🌿
echo ================================

REM Detect OS (should be Windows)
echo Detected OS: Windows %OS%

REM Check if Chocolatey is installed
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Chocolatey not found. Installing Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
) else (
    echo Chocolatey found.
)

REM Install Node.js using Chocolatey
echo Installing Node.js...
choco install nodejs -y

REM Refresh environment variables
call refreshenv.cmd

REM Verify Node.js and npm installation
echo Verifying Node.js and npm...
node --version
npm --version

REM Install project dependencies
echo Installing project dependencies...
npm install

REM Install Rust toolchain
echo Installing Rust toolchain...
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs ^| sh -s -- -y
echo WARNING: Be sure to add %USERPROFILE%\.cargo\bin to your PATH to be able to run the installed binaries
echo You can do this by adding the following to your system PATH environment variable:
echo %USERPROFILE%\.cargo\bin

REM Install wasm-pack for WebAssembly compilation
echo Installing wasm-pack...
%USERPROFILE%\.cargo\bin\cargo install wasm-pack

REM Build the application
echo Building LimeOS...
npm run build

REM Deploy to web directory
echo Deploying to C:\nginx\html\os...
if not exist "C:\nginx\html\os" mkdir "C:\nginx\html\os"
xcopy /E /I /Y dist\* "C:\nginx\html\os"

REM Install NGINX for Windows
echo Installing NGINX for Windows...
powershell -Command "Invoke-WebRequest -Uri 'http://nginx.org/download/nginx-1.24.0.zip' -OutFile 'nginx.zip'"
powershell -Command "Expand-Archive -Path 'nginx.zip' -DestinationPath 'C:\'"
ren "C:\nginx-1.24.0" "C:\nginx"
del nginx.zip

REM Copy NGINX configuration (adapted for Windows)
echo Configuring NGINX...
copy nginx\os_windows "C:\nginx\conf\sites-enabled\os"
echo include sites-enabled/*.conf; >> "C:\nginx\conf\nginx.conf"

REM Install Python for enrollment service
echo Installing Python...
choco install python -y
call refreshenv.cmd

REM Install Flask
pip install flask pyopenssl

REM Start enrollment service
echo Starting enrollment service...
start /B python security\enrol_server.py

REM Start NGINX
echo Starting NGINX...
start /B "C:\nginx\nginx.exe"

echo ✅ LimeOS installation complete!
echo NGINX is serving LimeOS at https://os.example.com
echo Enrollment service running on port 8080

pause