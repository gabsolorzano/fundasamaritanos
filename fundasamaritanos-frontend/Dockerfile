# ==========================================
# Etapa 1: Compilación de la aplicación con Node.js
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm install --legacy-peer-deps --no-audit --prefer-offline

# Copiar código fuente
COPY . .

# Argumento para URL del backend en tiempo de compilación Vite
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Compilar frontend para producción
RUN npm run build

# ==========================================
# Etapa 2: Servir con Nginx (ultra liviano < 25MB)
# ==========================================
FROM nginx:alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto estándar HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
