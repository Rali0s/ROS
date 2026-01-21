@echo off
REM ROS Security Cleanup Script for Windows
REM This script cleans up security-related files and keys

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "SECURITY_DIR=%SCRIPT_DIR%"
set "CERT_DIR=%SECURITY_DIR%certs"
set "LOG_DIR=%PROGRAMDATA%\ROS\logs"

echo ROS Security Cleanup Script for Windows
echo =======================================

REM Function to safely remove files
:safe_remove
if exist "%~1" (
    echo Removing %~1
    cipher /w:"%~1" >nul 2>&1
    del /f /q "%~1" 2>nul
)
goto :eof

REM Function to safely remove directories
:safe_remove_dir
if exist "%~1" (
    echo Removing directory %~1
    for /r "%~1" %%f in (*) do (
        call :safe_remove "%%f"
    )
    rd /s /q "%~1" 2>nul
)
goto :eof

REM Stop services
echo Stopping ROS services...
sc stop "ROS Enrollment Service" >nul 2>&1
sc delete "ROS Enrollment Service" >nul 2>&1

REM Remove certificates
echo Removing certificates...
if exist "%CERT_DIR%" (
    for %%f in ("%CERT_DIR%\*.cert") do call :safe_remove "%%f"
    for %%f in ("%CERT_DIR%\*.key") do call :safe_remove "%%f"
)

REM Remove server certificates
call :safe_remove "%SECURITY_DIR%server.crt"
call :safe_remove "%SECURITY_DIR%server.key"

REM Remove TPM data
echo Cleaning TPM data...
tpmtool.exe clear 2>nul || echo TPM cleanup requires TPM tools

REM Remove SGX data
echo Cleaning SGX data...
REM Note: SGX cleanup would require specific SGX tools

REM Remove SEV data
echo Cleaning SEV data...
REM Note: SEV cleanup not applicable on Windows

REM Remove log files
echo Removing log files...
if exist "%LOG_DIR%" (
    for %%f in ("%LOG_DIR%\*.log") do call :safe_remove "%%f"
)

REM Remove temporary files
echo Removing temporary files...
for /d %%d in (%TEMP%\ros_*) do call :safe_remove_dir "%%d"
for %%f in (%TEMP%\ros_*) do call :safe_remove "%%f"

REM Remove scheduled tasks
echo Removing scheduled tasks...
schtasks /delete /tn "ROS Security Monitor" /f >nul 2>&1

REM Remove registry entries
echo Removing registry entries...
reg delete "HKLM\SOFTWARE\ROS" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\ROS" /f >nul 2>&1

REM Remove user
echo Removing ROS user...
net user ros /delete >nul 2>&1

REM Remove installation directory
set /p choice="Remove entire ROS security directory (%SECURITY_DIR%)? (y/N): "
if /i "!choice!"=="y" (
    call :safe_remove_dir "%SECURITY_DIR%"
)

echo Security cleanup completed successfully!
echo Please reboot the system to ensure all changes take effect.

pause