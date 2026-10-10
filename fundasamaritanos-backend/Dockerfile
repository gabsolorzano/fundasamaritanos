FROM python:3.11-slim

# Evitar que Python escriba archivos .pyc en disco y deshabilitar buffer de logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente completo
COPY . .

# Dar permisos de ejecución al script de entrada y normalizar saltos de línea LF
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Exponer el puerto de FastAPI
EXPOSE 8000

# Usar script de arranque que aplica migraciones antes de levantar el servidor
ENTRYPOINT ["./entrypoint.sh"]

