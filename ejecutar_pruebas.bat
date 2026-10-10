@echo off
echo ========================================================
echo   Ejecutando Pruebas Unitarias del Backend (pytest)...
echo ========================================================
echo.
docker exec fundasamaritanos_backend pytest -v
echo.
echo ========================================================
echo   Ejecucion finalizada.
echo ========================================================
pause
