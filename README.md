# CaliDocs — SGC-IES

Sistema de gestión documental de calidad para institutos de Formación Profesional.

## Stack
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Auth**: JWT en cookie httpOnly
- **Frontend**: HTML/JS vanilla
- **Proxy**: Nginx
- **Contenedores**: Docker + docker-compose

## Arranque rápido

```bash
# 1. Copia y edita las variables de entorno
cp .env.example .env

# 2. Levanta el stack completo
docker-compose up --build

# 3. Abre http://localhost
#    Usuario inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (ver .env)
```

## Desarrollo con hot-reload

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
- Backend en `http://localhost:3000` (acceso directo a la API)
- Frontend en `http://localhost` (sirve `./frontend/` en vivo)

## Persistencia

Los datos se guardan en el volumen Docker `calidocs_data`. El archivo `calidocs.db` **no se pierde** al hacer `docker-compose down`. Para borrar los datos:

```bash
docker-compose down -v   # elimina también el volumen
```

## API — Fase 1

### Auth
| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | `{email, password}` | Devuelve cookie JWT |
| POST | `/api/auth/logout` | — | Borra la cookie |
| GET | `/api/auth/me` | — | Usuario autenticado |

### Centro (requiere auth)
| Método | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| GET | `/api/centro` | cualquiera | Config del centro |
| PUT | `/api/centro` | admin_centro | Actualiza config |

### Admin (solo superadmin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/centros` | Lista todos los centros |
| POST | `/api/admin/centros` | Crea un centro |
| POST | `/api/admin/centros/:id/usuarios` | Crea usuario en un centro |

## Roles
`superadmin` > `admin_centro` > `coordinador_calidad` > `docente` > `invitado`

## Roadmap
- [x] F1 — Backend base + auth + configuración del centro
- [ ] F2 — Gestor de carpetas SGC con persistencia
- [ ] F3 — Repositorio de documentos + buscador
- [ ] F4 — Generador IA (Claude API)
- [ ] F5 — Multi-centro + panel admin estatal
