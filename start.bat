@echo off
setlocal
title Zany Arcade Company
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo Install Node.js from https://nodejs.org/ and double-click start.bat again.
  echo.
  pause
  exit /b 1
)

if not exist "server.js" (
  echo.
  echo server.js is missing. Keep start.bat in the Zany Arcade Company folder.
  echo.
  pause
  exit /b 1
)

if not defined PORT set "PORT=8080"

echo.
echo ============================================
echo   ZANY ARCADE COMPANY
echo   http://localhost:%PORT%
echo   Elemental Little Wars + DownDownDown
echo ============================================
echo.
echo Starting the arcade server...
if not defined ELEMENTAL_NO_BROWSER start "" "http://localhost:%PORT%"
node server.js
echo.
echo The server has stopped.
pause
endlocal
