@echo off
echo Starting AI Document Intelligence System...
echo.

cd /d "%~dp0"

echo [1/2] Starting Worker...
start "Document Worker" cmd /k "node worker/start.js"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Next.js Server...
start "Next.js Server" cmd /k "npm run dev"

echo.
echo ================================
echo System Started Successfully!
echo ================================
echo.
echo Worker: Running in separate window
echo Web App: http://localhost:3000
echo.
echo Press any key to stop all services...
pause > nul

echo Stopping services...
taskkill /FI "WINDOWTITLE eq Document Worker*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Next.js Server*" /T /F > nul 2>&1
echo Done!
