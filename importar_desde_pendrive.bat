@echo off
setlocal
echo ========================================================
echo   Cargar Fundasamaritanos desde Pendrive (Modo Offline)
echo ========================================================
echo.

if not exist fundasamaritanos_imagenes.tar (
    echo [ERROR] No se encontro el archivo "fundasamaritanos_imagenes.tar".
    echo Asegurate de que el archivo este en la misma carpeta que este script.
    pause
    exit /b 1
)

echo Cargando imagenes de Docker en el equipo local...
docker load -i fundasamaritanos_imagenes.tar

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [EXITO] Imagenes cargadas correctamente!
    echo   Ya puedes hacer doble clic en "iniciar_sistema.bat".
    echo ========================================================
) else (
    echo.
    echo [ERROR] Ocurrio un problema al cargar las imagenes.
    echo Asegurate de que Docker Desktop este abierto y en ejecucion.
)
pause
