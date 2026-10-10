@echo off
echo ========================================================
echo   Deteniendo contenedores de Fundasamaritanos...
echo ========================================================
docker compose down
echo.
echo Contenedores detenidos correctamente. Los datos de la base de datos se conservan.
pause
