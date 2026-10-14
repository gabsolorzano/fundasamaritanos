@echo off
setlocal
echo ========================================================
echo   Exportar Fundasamaritanos para Pendrive (Modo Offline)
echo ========================================================
echo.
echo Este script creara un archivo comprimido con las imagenes de
echo Docker para que puedas instalar el sistema en cualquier computadora
echo de la fundacion SIN necesidad de conexion a internet.
echo.

echo Empaquetando imagenes Docker (puede demorar 1-2 minutos)...
docker save -o fundasamaritanos_imagenes.tar fundasamaritanos-frontend:latest fundasamaritanos-backend:latest postgres:15-alpine

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [EXITO] Archivo "fundasamaritanos_imagenes.tar" creado!
    echo.
    echo   Instrucciones para el pendrive:
    echo   1. Copia toda esta carpeta del proyecto en tu pendrive.
    echo   2. Incluye el archivo "fundasamaritanos_imagenes.tar".
    echo   3. En la maquina de la fundacion ejecuta:
    echo      "importar_desde_pendrive.bat"
    echo   4. Luego ejecuta "iniciar_sistema.bat" y listo.
    echo ========================================================
) else (
    echo.
    echo [ERROR] Hubo un problema al exportar las imagenes.
)
pause
