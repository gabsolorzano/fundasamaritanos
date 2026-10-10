#!/bin/sh
set -e

echo "Esperando a que la base de datos PostgreSQL esté lista..."
while ! nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL está listo."

echo "Ejecutando migraciones de base de datos con Alembic..."
alembic upgrade head || echo "Alembic finalizado o sin migraciones pendientes."

echo "Verificando / cargando datos iniciales del sistema..."
python -m app.seeders.seed --if-empty || echo "Aviso: Error durante la inicialización de datos."

echo "Iniciando servidor FastAPI con Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

