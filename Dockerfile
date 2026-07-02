FROM node:20

# ✅ Instalar ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json y archivos TS necesarios
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# Instalar dependencias
RUN npm ci

# Build (si usas TS)
RUN npm run build

# Archivos estáticos
RUN cp -R src/public dist/public

# Eliminar dependencias de desarrollo, reduce tamaño final de imagen
RUN npm prune --omit=dev

# Render inyecta PORT
EXPOSE 8000

CMD ["npm", "start"]