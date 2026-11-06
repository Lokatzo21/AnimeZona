@echo off
setlocal
title Actualizar AnimeZona Web (pages.dev)
cd /d "C:\Users\manue\OneDrive\Documentos\Anime"

echo ================================================================
echo       ACTUALIZAR ANIMEZONA EN CLOUDFLARE PAGES
echo               https://animezona.pages.dev
echo ================================================================
echo.

echo 1. Verificando sesion de Cloudflare...
call npx wrangler whoami >nul 2>&1
if errorlevel 1 goto LOGIN_CF
goto BUILD_VITE

:LOGIN_CF
echo.
echo No has iniciado sesion en esta consola.
echo Abriendo tu navegador para autorizar Cloudflare...
call npx wrangler login
if errorlevel 1 goto ERROR_LOGIN
echo.
echo Sesion iniciada correctamente.
echo.

:BUILD_VITE
echo 2. Compilando aplicacion con Vite...
call npm run build
if errorlevel 1 goto ERROR_BUILD

echo.
echo 3. Subiendo a Cloudflare Pages (animezona)...
call npx wrangler pages project create animezona --production-branch main >nul 2>&1
call npx wrangler pages deploy dist --project-name=animezona --branch=main --commit-dirty=true
if errorlevel 1 goto ERROR_DEPLOY

echo.
echo ================================================================
echo   EXITO TOTAL: AnimeZona actualizado correctamente en:
echo   https://animezona.pages.dev
echo ================================================================
goto END

:ERROR_LOGIN
echo.
echo [ERROR] No se pudo iniciar sesion en Cloudflare.
goto END

:ERROR_BUILD
echo.
echo [ERROR] Fallo la compilacion con Vite.
goto END

:ERROR_DEPLOY
echo.
echo [ERROR] Hubo un problema al subir a Cloudflare Pages.
goto END

:END
echo.
pause