@echo off
title Smart Scraper (GUI)
color 0B

echo ===========================================
echo       INICIANDO SMART SCRAPER (ZONAAPS)
echo ===========================================
echo.
echo Iniciando servidor inteligente en el puerto 4002...
echo Abriendo el navegador automaticamente...
echo.

cd gui-scraper-smart-v4
start http://localhost:4002
node server.js

echo.
pause
