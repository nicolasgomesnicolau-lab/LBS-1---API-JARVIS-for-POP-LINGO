@echo off
cls
echo ==========================================
echo    INICIANDO BACKEND POP LINGO (JARVIS)
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/2] Ligando API Express...
start "Servidor API" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Abrindo túnel Ngrok...
start "Tunnel Ngrok" cmd /k ".\ngrok.exe http 3000 --domain=tactile-scribble-postage.ngrok-free.dev"

echo.
echo ==========================================
echo    TUDO OK!
echo ==========================================
echo.
pause
