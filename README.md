# CaliDocs — SGC-IES

Sistema de gestión documental de calidad para institutos de Formación Profesional, desplegable con Docker.

## Arranque rápido

```bash
# 1. Copia y edita las variables de entorno
cp .env.example .env

# 2. Levanta el stack completo (primera vez: ~2-3 min compilando better-sqlite3)
docker-compose up --build

# 3. Abre http://localhost
#    Login inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (ver .env)
```

## Desarrollo con hot-reload

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend en `http://localhost` (sirve `./frontend/` en vivo)
- API directamente en `http://localhost:3000`

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20 + Express |
| Base de datos | SQLite (better-sqlite3) + WAL mode |
| Auth | JWT en cookie httpOnly |
| Frontend | HTML/JS vanilla + DM Sans/Serif/Mono |
| IA | Claude API (claude-sonnet-4-6) |
| DOCX | librería docx |
| Uploads | multer |
| Proxy | Nginx 1.25 |
| Contenedores | Docker + docker-compose |

## Persistencia de datos

Los datos viven en el volumen Docker `calidocs_data`:
- `calidocs.db` — base de datos SQLite
- `docs/` — archivos subidos y generados por IA

```bash
docker-compose down       # para sin borrar datos
docker-compose down -v    # para Y borra todos los datos
```

## Variables de entorno clave

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Secreto para firmar JWT (genera con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `SEED_ADMIN_EMAIL` | Email del superadmin creado en el primer arranque |
| `SEED_ADMIN_PASSWORD` | Contraseña del superadmin |
| `ANTHROPIC_API_KEY` | Clave de la Claude API (obligatoria para el Módulo 4) |

## Módulos implementados

### F1 — Configuración del centro
- Login con JWT en cookie httpOnly
- Roles: `superadmin > admin_centro > coordinador_calidad > docente > invitado`
- Configuración del centro: nombre, código, logo, dirección, año académico
- Soporte multi-centro desde el inicio

### F2 — Gestor de carpetas SGC
- Árbol de carpetas basado en ISO 9001:2015 para IES
- Preloading del árbol estándar al crear un centro
- Añadir, renombrar, eliminar carpetas
- Exportación de scripts `bash` y `PowerShell` para crear la estructura en disco

### F3 — Repositorio de documentos
- Subida de archivos (drag&drop o selector)
- Descarga directa
- Búsqueda por nombre, código y tipo
- Control de versiones: `borrador → vigente → obsoleto`
- Asociación de documentos a carpetas del árbol SGC

### F4 — Generador IA (Claude API)
- El usuario escribe el nombre del documento
- El sistema detecta automáticamente el tipo por prefijo (`f-`, `i-`, `p-`, `prs-`, `pf-`, `Anexo-`) y la sección ISO por número
- Claude genera el contenido completo adaptado al contexto educativo FP
- Se guarda como `.docx` en el repositorio con estado `borrador`
- Preview del contenido antes de descargar

### F5 — Panel de administración (superadmin)
- Estadísticas globales del sistema
- Crear y gestionar múltiples centros
- Alta de usuarios por centro con rol específico
- Tabla de centros con métricas de uso

## API

### Auth (`/api/auth`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/login` | `{email, password}` → cookie JWT |
| POST | `/logout` | Borra la cookie |
| GET | `/me` | Usuario autenticado |

### Centro (`/api/centro`)
| Método | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| GET | `/` | cualquiera | Config del centro |
| PUT | `/` | admin_centro | Actualiza config |

### Carpetas (`/api/carpetas`)
| Método | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| GET | `/` | cualquiera | Árbol completo |
| POST | `/` | coordinador | Nueva carpeta |
| PUT | `/:id` | coordinador | Renombrar/mover |
| DELETE | `/:id` | coordinador | Eliminar |
| POST | `/reset` | admin | Recargar árbol SGC estándar |
| GET | `/script?tipo=bash\|ps` | cualquiera | Script de creación |

### Documentos (`/api/documentos`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista todos (filtros: `carpeta`, `estado`, `tipo`) |
| GET | `/buscar?q=texto` | Búsqueda fuzzy |
| POST | `/` | Subida (multipart/form-data) |
| GET | `/:id/descargar` | Descarga el archivo |
| PUT | `/:id` | Actualiza metadatos |
| DELETE | `/:id` | Elimina |

### Generador IA (`/api/generador`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/analizar?nombre=...` | Detecta tipo y sección ISO |
| POST | `/` | `{nombre, id_carpeta?}` → genera DOCX con Claude |

### Admin (`/api/admin`) — solo superadmin
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/stats` | Estadísticas globales |
| GET | `/centros` | Lista centros |
| POST | `/centros` | Crea centro (+ árbol SGC automático) |
| GET | `/centros/:id/usuarios` | Lista usuarios del centro |
| POST | `/centros/:id/usuarios` | Crea usuario |
| PUT | `/usuarios/:id/toggle` | Activa/desactiva usuario |
