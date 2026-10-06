@echo off
title Scraper CompucaliTV - AnimeZona
color 0b
cd /d "C:\Users\manue\OneDrive\Documentos\Anime"

node scraper\compucalitv_scraper.js %*

echo.
echo Presiona cualquier tecla para cerrar la ventana...
pause >nul
