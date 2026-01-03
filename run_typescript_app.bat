@echo off
REM ============================================
REM City Central Loan Dashboard - TypeScript App
REM Starts Backend (port 3001) and Frontend (port 5813)
REM ============================================

echo.
echo ========================================
echo   City Central Loan Dashboard - TypeScript
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [1/2] Starting Backend API Server on port 3001...
echo.

REM Start backend in a new terminal window
start "Loan Dashboard - Backend API" cmd /k "cd /d %~dp0backend && npm run dev"

REM Wait for backend to initialize
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Starting Frontend on port 5813...
echo.

REM Start frontend in a new terminal window
start "Loan Dashboard - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo   Backend API:  http://localhost:3001
echo   Frontend UI:  http://localhost:5813
echo.
echo   NOTE: Hot reload is disabled on network drives.
echo   Restart the frontend to see code changes.
echo.
echo   Close the terminal windows to stop the servers.
echo ========================================
echo.

REM Wait a few seconds then open the browser
timeout /t 10 /nobreak >nul
start http://localhost:5813

exit /b 0
