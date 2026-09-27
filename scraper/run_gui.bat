@echo off
title Panel Visual (GUI Scraper)
color 0A

echo ===========================================
echo       INICIANDO PANEL VISUAL (ZONAAPS)
echo ===========================================
echo.
echo Iniciando servidor en el puerto 4000...
echo Abriendo el navegador automaticamente...
echo.

cd gui-scraper
start http://localhost:4000
node server.js

echo.
pause
