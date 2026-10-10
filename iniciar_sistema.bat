@echo off
setlocal
echo ========================================================
echo   Iniciando Fundasamaritanos en Contenedores Docker...
echo ========================================================

:: Verificar si Docker Desktop esta corriendo
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] Docker Desktop no parece estar iniciado o listo todavia.
    echo Intentando iniciar Docker Desktop...
    start "" "C:\Users\Carlos Villarreal\Desktop\Docker Desktop.lnk" 2>nul
    echo Por favor espera unos segundos a que el icono de la ballena de Docker este en verde en la barra de tareas.
    echo.
    pause
)

echo Construyendo y levantando contenedores...
docker compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Ocurrio un problema al levantar los contenedores.
    echo Asegurate de que Docker Desktop este completamente iniciado.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   Sistema levantado con exito!
echo   Frontend: http://localhost (o http://localhost:5173)
echo   Backend / Docs: http://localhost:8000/docs
echo   Base de Datos: Puerto 5433 (para no chocar con el 5432)
echo.
echo   Credenciales demo:
echo   - Admin:  admin  / admin123
echo   - Editor: editor / editor123
echo   - Lector: lector / lector123
echo ========================================================
echo.
echo Abriendo el navegador en http://localhost ...
start http://localhost
pause

