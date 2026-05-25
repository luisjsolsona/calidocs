# CaliDocs — SGC-IES

Sistema de gestión documental de calidad para institutos de Formación Profesional.

---

## Despliegue

```bash
# 1. Clona el repositorio
git clone https://github.com/luisjsolsona/calidocs.git
cd calidocs

# 2. Copia y edita las variables de entorno
cp .env.example .env
# Edita .env: cambia JWT_SECRET, contraseñas y añade ANTHROPIC_API_KEY si usas el generador IA

# 3. Levanta el stack (primera vez tarda ~2-3 min compilando dependencias nativas)
docker compose up -d --build

# 4. Abre http://localhost
#    Credenciales iniciales: las definidas en SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD del .env
```

### Parar sin perder datos

```bash
docker compose down
```

### Parar y borrar todos los datos

```bash
docker compose down -v
```

---

## Desarrollo con hot-reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

El frontend se sirve directamente desde `./frontend/` y el backend recarga al guardar.
