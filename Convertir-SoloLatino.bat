@echo off
chcp 65001 > nul
title Convertidor Inteligente de Links de SoloLatino (Mediafire) - AnimeZona
cls
cd /d "C:\Users\manue\OneDrive\Documentos\Anime"
node scraper\sololatino_scraper.cjs %*
pause
