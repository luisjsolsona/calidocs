FROM node:20-alpine AS base

WORKDIR /app

# better-sqlite3 necesita compilar módulos nativos
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts=false

COPY src/ ./src/

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "src/server.js"]

# ── Desarrollo: incluye devDependencies y nodemon ─────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --ignore-scripts=false
COPY src/ ./src/
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["npx", "nodemon", "src/server.js"]
