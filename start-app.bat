@echo off
title PS Cafe Pro
cls
echo ============================================
echo       PS Cafe Pro - تشغيل النظام
echo ============================================
echo.
cd /d "%~dp0"

:: Start server in a separate minimized window
start /MIN "PS-Cafe-Pro-Server" cmd /c "npm run start:sqlite"

:: Waiting...
echo ... server is starting, please wait
timeout /t 5 /nobreak >nul

:: Open browser
start http://localhost:3000

cls
echo ============================================
echo    PS Cafe Pro is running!
echo.
echo    http://localhost:3000
echo.
echo    السيرفر شغال في النافذة التانيه
echo    عشان توقفه، اقفل نافذة السيرفر
echo ============================================
echo.
pause
