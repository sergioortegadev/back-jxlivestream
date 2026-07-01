FROM node:20

# ✅ Instalar ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json y archivos TS necesarios
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

# Instalar dependencias
RUN npm ci --omit=dev

# Build (si usas TS)
RUN npm run build

# Exponer puertos (HTTP y RTMP)
EXPOSE 8000 1935

# Comando
CMD ["npm", "start"]
