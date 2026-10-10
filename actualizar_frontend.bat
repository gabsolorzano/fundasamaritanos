@echo off
title Actualizar Frontend - Fundasamaritanos
color 0B
echo.
echo  ================================================================
echo   FUNDASAMARITANOS - Actualizar Frontend
echo  ================================================================
echo.
echo  [1/2] Reconstruyendo imagen del frontend (puede tardar 2-3 min)...
echo.
docker compose build frontend
if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Fallo al construir la imagen del frontend.
    pause
    exit /b 1
)
echo.
echo  [2/2] Reiniciando contenedor del frontend...
docker compose up -d --no-deps frontend
echo.
echo  ================================================================
echo   Frontend actualizado correctamente!
echo   Abre http://localhost y recarga con Ctrl+Shift+R
echo  ================================================================
echo.
pause
