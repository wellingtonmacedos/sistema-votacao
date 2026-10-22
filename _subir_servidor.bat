@echo off
chcp 65001 >nul
title SISTEMA DE VOTACAO - Next.js DEV
color 0A
cd /D "%~dp0"

set UV_THREADPOOL_SIZE=4
set UV_USE_IOCP=1
set CHOKIDAR_USEPOLLING=1
set WATCHPACK_POLLING=true
set NEXT_PRIVATE_BUILD_WORKER_COUNT=1

if not exist "%APPDATA%\npm" mkdir "%APPDATA%\npm" 2>nul

echo === Limpando zumbis porta 3000 ===
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /R /C:":3000.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ============================================================
echo   SISTEMA DE VOTACAO - Subindo servidor
echo ============================================================
echo   Quando aparecer "Ready in ...ms":
echo      http://localhost:3000
echo.
echo   Login ADMIN:
echo      Email:  admin@camara.gov.br
echo      Senha:  admin123
echo.
echo   (Deixe esta janela aberta)
echo ============================================================
echo.

node.exe "node_modules\next\dist\bin\next" dev -p 3000

echo.
echo === Servidor encerrou. Pressione qualquer tecla... ===
pause >nul
