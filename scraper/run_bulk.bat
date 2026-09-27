@echo off
title Anime Bulk Scraper
color 0A

echo ===========================================
echo       ANIME BULK SCRAPER (ZONAAPS)
echo ===========================================
echo.
set /p url="Pega el enlace de la serie (Ej: https://zonaaps.com/tvshows/solo-leveling/): "
echo.
echo Ejecutando Scraper...
echo.

node bulk_scraper.js "%url%"

echo.
pause
