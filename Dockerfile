FROM node:20

# ✅ Instalar ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json y archivos TS necesarios
COPY package*.json ./
COPY patches/ ./patches/
COPY tsconfig.json ./
COPY src/ ./src/

# Instalar dependencias
RUN npm ci

# Build (si usas TS)
RUN npm run build
RUN cp -R src/public ./dist/public

# Reducir tamaño final de imagen
RUN npm prune --omit=dev

# Exponer puertos (HTTP y RTMP)
EXPOSE 8000 1935

# Comando
CMD ["npm", "start"]
