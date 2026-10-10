@echo off
setlocal
echo ========================================================
echo   Reiniciar Base de Datos de Fundasamaritanos (Docker)
echo ========================================================
echo.
echo CUIDADO: Esta accion eliminara el volumen de la base de datos de Docker
echo y la proxima vez que inicies el sistema, se creara limpia desde cero.
echo.
set /p CONFIRM="Deseas continuar? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo Operacion cancelada.
    pause
    exit /b 0
)

echo Deteniendo y eliminando volumenes de Docker...
docker compose down -v
echo.
echo ========================================================
echo   Base de datos de Docker restablecida limpiamente.
echo ========================================================
pause
