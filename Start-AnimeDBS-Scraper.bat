@echo off
title AnimeDBS Scraper
color 0A

echo ===========================================
echo       INICIANDO SCRAPER DE ANIMEDBS
echo ===========================================
echo.
echo Iniciando servidor inteligente...
echo Abriendo el navegador automaticamente...
echo.

cd scraper\gui-scraper-smart-v4
start http://localhost:4002
node server.js

echo.
pause
