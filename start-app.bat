@echo off
title PS Cafe Pro Server
echo Starting PS Cafe Pro System... Please wait.

:: Go to the directory where this batch file is located
cd /d "%~dp0"

:: Wait for a few seconds to ensure everything handles properly
timeout /t 2 /nobreak >nul

:: Start the default browser pointing to the app
start http://localhost:3000

:: Start the Next.js production server
npm run start
