@echo off
title Anime Scraper
color 0A

echo =========================================
echo      Iniciando Scraper de Anime
echo =========================================
echo.

:: Verificar si Node.js esta instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Por favor descarga e instala Node.js desde https://nodejs.org/
    pause
    exit
)

:: Verificar dependencias y descargarlas si no existen en la nueva compu
if not exist "node_modules\" (
    echo [INFO] Detectando nueva computadora... Instalando dependencias (esto solo tomara un momento)...
    call npm install
    echo.
)

echo [INFO] Iniciando el servidor del scraper...
echo [INFO] El panel del scraper se abrira automaticamente en tu navegador...
echo.

:: Esperar un segundo y abrir el navegador en localhost:4001
start http://localhost:4001

:: Iniciar el scraper
cd gui-scraper-smart
node server.js

pause
