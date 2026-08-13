@echo off
echo Iniciando servidor de desarrollo de AnimeZona...
cd /d "%~dp0"
call npm.cmd run dev
pause
