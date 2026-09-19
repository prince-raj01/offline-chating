@echo off
title Allow OfflineChat through Windows Firewall
color 0a
echo ============================================================
echo      ALLOWING OFFLINE CHAT THROUGH WINDOWS FIREWALL
echo ============================================================
echo.

:: Check for administrative rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [REQUESTING ADMIN PRIVILEGES]
    echo Please click "YES" on the Windows prompt to allow firewall access...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [1/2] Adding Firewall Inbound Rule for Port 3000...
netsh advfirewall firewall delete rule name="OfflineChat Port 3000" >nul 2>&1
netsh advfirewall firewall add rule name="OfflineChat Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Firewall rule added successfully!
) else (
    echo [WARNING] Could not add firewall rule automatically.
)

echo.
echo [2/2] Setting Wi-Fi network profile to Private...
powershell -Command "Get-NetConnectionProfile | Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue" >nul 2>&1

echo.
echo ============================================================
echo ALL DONE! Your phone can now connect to:
echo http://10.18.17.91:3000
echo ============================================================
echo.
pause
