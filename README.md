# CaliDocs — SGC-IES

Sistema de gestión documental de calidad para institutos de Formación Profesional.

---

## Usuarios y datos de demostración

En el **primer arranque** se crean automáticamente, sin ninguna acción adicional:

- Un **superadmin** global para administrar el sistema.
- Un centro de demostración **"IES Demo"** con la estructura completa de carpetas SGC (ISO 9001:2015, secciones 4–8 + Anexos) ya generada.
- Un usuario de prueba por cada rol, todos asignados al centro IES Demo.

| Rol | Acceso a | Email | Contraseña |
|-----|----------|-------|------------|
| `superadmin` | Todo el sistema, todos los centros | `admin@calidocs.es` | `Admin1234!` |
| `admin_centro` | Configuración y usuarios del centro | `director@demo.es` | `Director1234!` |
| `coordinador_calidad` | Carpetas y documentos | `calidad@demo.es` | `Calidad1234!` |
| `docente` | Lectura y subida de documentos | `docente@demo.es` | `Docente1234!` |
| `invitado` | Solo lectura | `invitado@demo.es` | `Invitado1234!` |

Las contraseñas se cambian desde el **Panel de administración → fila del centro → usuarios**.
Para no crear los datos demo (entorno de producción), añade `SEED_DEMO=false` al `.env` antes del primer arranque.

---

## Funcionamiento básico

CaliDocs organiza la documentación de un Sistema de Gestión de Calidad (ISO 9001:2015) para centros de Formación Profesional. Funciona en **modo multi-centro**: cada instituto tiene su propio espacio de usuarios, carpetas y documentos, totalmente aislado.

### 1. Primer acceso y administración

Entra con el usuario `superadmin`. Desde el **Panel de administración** (menú lateral) puedes:

- Ver estadísticas globales del sistema.
- Crear nuevos centros — al crearlos se genera automáticamente el árbol SGC estándar.
- Hacer clic en cualquier fila de centro para ver y gestionar sus usuarios: activar/desactivar o eliminar usuarios, y crear nuevos con el rol que necesites.

### 2. Árbol SGC

La estructura de carpetas sigue la norma ISO 9001:2015 adaptada a IES de FP (secciones 4–8 + Anexos con sus formatos e instrucciones). Desde esta sección puedes:

- **Añadir** carpetas y subcarpetas con nombre y código opcional.
- **Renombrar** carpetas con un modal propio (clic en ✏).
- **Eliminar** carpetas (y sus subcarpetas).
- **Cargar plantilla SGC** — restaura el árbol estándar desde cero (requiere rol `admin_centro`).
- **Descargar script** — genera un `.ps1` (PowerShell) o `.sh` (Bash) para crear la misma estructura de carpetas en tu PC con un solo clic.

### 3. Repositorio de documentos

Sube cualquier archivo (PDF, DOCX, ODT, XLSX…) con drag & drop o selector. Para cada documento puedes indicar:

- **Nombre, código y tipo** (formato, instrucción, procedimiento, proceso, proyecto, anexo).
- **Carpeta** de destino dentro del árbol SGC.
- **Estado:** `borrador → vigente → obsoleto`, cambiable directamente con el selector de la tabla.

Incluye búsqueda por nombre, código o tipo, y filtro por carpeta.

### 4. Generador IA

Escribe el nombre del documento respetando las convenciones de nomenclatura del SGC:

| Prefijo | Tipo de documento |
|---------|-------------------|
| `f-` | Formato / formulario |
| `i-` | Instrucción de trabajo |
| `p-` | Procedimiento |
| `prs-` | Mapa / ficha de proceso |
| `pf-` | Proyecto funcional |
| `Anexo-` | Anexo informativo |

Ejemplo: `f-6.2-b-01_Ficha_recogida_datos_profesorado`

Claude detecta automáticamente el tipo y la sección ISO, genera el contenido completo adaptado al contexto educativo FP y lo guarda como borrador `.docx` en el repositorio, listo para descargar y editar.

> Requiere `ANTHROPIC_API_KEY` en el `.env`.

### 5. Permisos por rol

| Acción | invitado | docente | coordinador | admin_centro | superadmin |
|--------|:--------:|:-------:|:-----------:|:------------:|:----------:|
| Ver documentos y árbol | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subir / eliminar documentos | | ✓ | ✓ | ✓ | ✓ |
| Crear / editar carpetas | | | ✓ | ✓ | ✓ |
| Cargar plantilla SGC | | | | ✓ | ✓ |
| Configurar el centro | | | | ✓ | ✓ |
| Panel de administración | | | | | ✓ |

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

# 4. Abre http://localhost:7500
#    Superadmin:  admin@calidocs.es  /  Admin1234!
#    Demo centro: director@demo.es   /  Director1234!  (y más usuarios, ver tabla arriba)
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

El frontend se sirve en `http://localhost:7500` y el backend recarga al guardar.

---

## Interacción con el sistema anfitrión (Windows / PC)

CaliDocs corre dentro de Docker, por lo que **no puede ejecutar acciones directamente** en tu PC. Sin embargo hay dos puentes disponibles:

- **Scripts de estructura de carpetas** — desde la sección "Árbol SGC" puedes descargar un script `.ps1` (PowerShell) o `.sh` (Bash) que crea en tu PC la misma estructura de carpetas del SGC. Solo hay que ejecutarlo una vez.

- **Carpeta compartida** — si quieres acceder a los archivos del repositorio directamente desde el Explorador de Windows, monta tu carpeta local en el volumen de datos. Añade esto al `docker-compose.yml` en el servicio `backend`:

  ```yaml
  volumes:
    - C:/CaliDocs/datos:/app/data
  ```

  Así los documentos subidos o generados por IA quedarán en `C:\CaliDocs\datos\docs\` y serán accesibles desde Windows como cualquier carpeta normal.
