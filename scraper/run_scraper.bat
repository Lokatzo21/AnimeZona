@echo off
title AnimeZona Scraper GUI

echo ===========================================
echo   Iniciando el Servidor del Scraper GUI
echo ===========================================
echo.
echo 1. Abriendo interfaz en el navegador...
start http://localhost:4000

echo 2. Encendiendo servidor Node.js...
node gui-scraper/server.js

pause
