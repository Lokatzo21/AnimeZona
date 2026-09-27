@echo off
title Anime Auto Scraper
color 0D

echo ===========================================
echo       ANIME AUTO SCRAPER
echo ===========================================
echo.
set /p url="Pega el enlace a escrapear: "
echo.
echo Ejecutando Auto Scraper...
echo.

node auto_scraper.js "%url%"

echo.
pause
