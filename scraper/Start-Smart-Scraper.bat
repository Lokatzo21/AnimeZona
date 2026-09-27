@echo off
title Smart Scraper (GUI)
color 0B

echo ===========================================
echo       INICIANDO SMART SCRAPER (ZONAAPS)
echo ===========================================
echo.
echo Iniciando servidor inteligente en el puerto 4001...
echo Abriendo el navegador automaticamente...
echo.

cd gui-scraper-smart
start http://localhost:4001
node server.js

echo.
pause
