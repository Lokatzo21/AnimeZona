@echo off
chcp 65001 > nul
title Conversor de Enlaces Mediafire Directos a Web - AnimeZona
cls
cd /d "C:\Users\manue\OneDrive\Documentos\Anime"
node scraper\convert_mediafire_link.cjs %*
pause
