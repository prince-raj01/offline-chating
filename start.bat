@echo off
title OfflineChat - 100% Offline Real-Time Web Server
color 0b
echo ============================================================
echo         STARTING OFFLINE CHAT LOCAL SERVER
echo ============================================================
echo.

cd /d "%~dp0"

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ to run this app.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies (first-time setup)...
    call npm install
    echo.
)

:: Launch browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Start the server
node server.js

pause
