@echo off
title Anime Bulk Scraper 2.0
color 0B

echo ===========================================
echo     ANIME BULK SCRAPER 2.0 (ZONAAPS)
echo ===========================================
echo.
set /p url="Pega el enlace de la serie (Ej: https://zonaaps.com/tvshows/solo-leveling/): "
echo.
echo Ejecutando Scraper 2.0...
echo.

node bulk_scraper_2.js "%url%"

echo.
pause
