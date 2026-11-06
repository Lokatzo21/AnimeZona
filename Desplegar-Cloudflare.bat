@echo off
chcp 65001 > nul
title Desplegar StreamZona / AnimeZona en Cloudflare Pages
color 0B
cls
cd /d "%~dp0"

echo ================================================================
echo      🚀 DESPLIEGUE EN CLOUDFLARE PAGES (100%% GRATIS E ILIMITADO)
echo ================================================================
echo.
echo 1. Compilando la aplicacion web (Vite)...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    color 0C
    echo [ERROR] La compilacion con Vite fallo. Revisa los errores arriba.
    pause
    exit /b 1
)

echo.
echo 2. Subiendo a Cloudflare Pages con funciones serverless de Worker...
echo    (Si es tu primera vez, se abrira tu navegador para iniciar sesion gratis)
echo.

call npx wrangler pages deploy dist --project-name=streamzona

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo  🎉 ¡DESPLIEGUE EXITOSO EN CLOUDFLARE PAGES!
    echo  Tu web ya esta en linea con ancho de banda 100%% ILIMITADO.
    echo ================================================================
) else (
    echo.
    color 0C
    echo [AVISO] Si te pidio iniciar sesion, completa el login en el navegador
    echo y vuelve a ejecutar este archivo.
)

echo.
echo Presiona cualquier tecla para salir...
pause > nul
