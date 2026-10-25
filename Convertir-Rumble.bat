@echo off
chcp 65001 > nul
title Convertidor Inteligente de Links de Rumble - AnimeZona
cls
cd /d "C:\Users\manue\OneDrive\Documentos\Anime"
node scraper\rumble_converter.js %*
pause
