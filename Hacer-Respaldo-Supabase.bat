@echo off
chcp 65001 > nul
title Respaldador de Base de Datos Supabase - StreamZona
color 0B
cls
cd /d "C:\Users\manue\OneDrive\Documentos\Anime"

echo ================================================================
echo        INICIANDO COPIA DE SEGURIDAD DE TODA LA BASE DE DATOS
echo ================================================================
echo.

node scraper\backup_supabase.cjs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Abriendo carpeta de respaldos en el Explorador de Windows...
    start "" "M:\BD STREAMING"
) else (
    echo.
    color 0C
    echo [ERROR] Hubo un problema al conectar o descargar el respaldo.
)

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
