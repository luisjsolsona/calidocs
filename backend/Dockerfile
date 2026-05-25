FROM node:20-alpine AS base

WORKDIR /app

# better-sqlite3 necesita compilar módulos nativos → python3 y make
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Directorio de datos (montado como volumen en runtime)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/server.js"]

# ── Imagen de desarrollo (con devDependencies y nodemon) ──────────────────────
FROM base AS dev
RUN npm ci
CMD ["npx", "nodemon", "src/server.js"]
