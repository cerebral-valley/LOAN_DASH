@echo off
echo ========================================
echo  Starting Loan Dashboard Application
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npx tsx src/index.ts"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend Application...
start "Frontend App" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo  Application Starting
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5813
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause
