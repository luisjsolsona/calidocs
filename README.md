# CaliDocs — SGC-IES

Sistema de gestión documental de calidad para institutos de Formación Profesional.

---

## Funcionamiento básico

CaliDocs organiza la documentación de un Sistema de Gestión de Calidad (ISO 9001:2015) para centros de Formación Profesional. Funciona en **modo multi-centro**: cada instituto tiene su propio espacio de usuarios, carpetas y documentos, totalmente aislado.

**Primer acceso:** entra con las credenciales de superadmin definidas en el `.env`. Desde el **Panel de administración** crea los centros y sus usuarios.

**Árbol SGC:** al crear un centro se genera automáticamente la estructura de carpetas estándar ISO 9001 adaptada a IES (secciones 4–8 + Anexos). Puedes añadir, renombrar o eliminar carpetas, y exportar la estructura como script Bash o PowerShell para replicarla en disco.

**Repositorio de documentos:** sube cualquier archivo (PDF, DOCX, ODT…), asígnalo a una carpeta del árbol y elige su tipo y estado (`borrador / vigente / obsoleto`). El estado se puede cambiar directamente desde la tabla. Incluye búsqueda por nombre, código o tipo, y filtro por carpeta.

**Generador IA:** escribe el nombre del documento siguiendo las convenciones de nomenclatura (`f-`, `i-`, `p-`, `prs-`, `pf-`, `Anexo-`) y Claude genera el contenido completo adaptado al contexto educativo FP. El resultado se guarda automáticamente como borrador en el repositorio y se puede descargar en formato `.docx`.

**Roles disponibles:** `superadmin` · `admin_centro` · `coordinador_calidad` · `docente` · `invitado` — cada uno con permisos de lectura/escritura apropiados.

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
