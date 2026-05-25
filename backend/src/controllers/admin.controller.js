const bcrypt  = require('bcryptjs');
const db      = require('../db');
const Centro  = require('../models/centro.model');
const Usuario = require('../models/usuario.model');
const { insertarArbol, ARBOL_SGC } = require('../services/carpetas.seed');

// GET /api/admin/centros
function listCentros(_req, res) {
  res.json(Centro.findAll());
}

// POST /api/admin/centros
function createCentro(req, res, next) {
  try {
    const { nombre, codigo } = req.body;
    if (!nombre || !codigo) return res.status(400).json({ error: 'nombre y codigo son obligatorios' });

    const centro = Centro.create(req.body);
    insertarArbol(db, centro.id, ARBOL_SGC);
    res.status(201).json(centro);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'El código de centro ya existe' });
    next(err);
  }
}

// POST /api/admin/centros/:id/usuarios
async function createUsuario(req, res, next) {
  try {
    const id_centro = parseInt(req.params.id, 10);
    if (isNaN(id_centro)) return res.status(400).json({ error: 'id de centro inválido' });

    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol)
      return res.status(400).json({ error: 'nombre, email, password y rol son obligatorios' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Formato de email inválido' });

    const rolesValidos = ['admin_centro', 'coordinador_calidad', 'docente', 'invitado'];
    if (!rolesValidos.includes(rol))
      return res.status(400).json({ error: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` });

    const password_hash = await bcrypt.hash(password, 10);
    const usuario = Usuario.create({ nombre, email, password_hash, rol, id_centro });
    res.status(201).json(usuario);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'El email ya está registrado' });
    next(err);
  }
}

// GET /api/admin/centros/:id/usuarios
function listUsuariosCentro(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  res.json(Usuario.findByCentro(id));
}

// PUT /api/admin/usuarios/:id/toggle — activa/desactiva
function toggleUsuario(req, res) {
  const u = db.prepare('SELECT activo FROM usuarios WHERE id = ? AND rol != ?').get(req.params.id, 'superadmin');
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado o no modificable' });
  db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(u.activo ? 0 : 1, req.params.id);
  res.json({ activo: !u.activo });
}

// DELETE /api/admin/usuarios/:id — elimina usuario (no se puede eliminar superadmin)
function deleteUsuario(req, res) {
  const u = db.prepare("SELECT id FROM usuarios WHERE id = ? AND rol != 'superadmin'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado o no eliminable' });
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}

// GET /api/admin/stats — estadísticas globales con paginación de centros
function stats(req, res) {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const offset = (page - 1) * limit;

  const centros    = db.prepare('SELECT COUNT(*) as n FROM centros').get().n;
  const usuarios   = db.prepare('SELECT COUNT(*) as n FROM usuarios WHERE activo = 1').get().n;
  const carpetas   = db.prepare('SELECT COUNT(*) as n FROM carpetas').get().n;
  const documentos = db.prepare('SELECT COUNT(*) as n FROM documentos').get().n;
  const borradores = db.prepare("SELECT COUNT(*) as n FROM documentos WHERE estado='borrador'").get().n;
  const vigentes   = db.prepare("SELECT COUNT(*) as n FROM documentos WHERE estado='vigente'").get().n;
  const generadosIA= db.prepare('SELECT COUNT(*) as n FROM documentos WHERE generado_ia=1').get().n;

  const porCentro = db.prepare(`
    SELECT c.id, c.nombre, c.codigo,
      COUNT(DISTINCT u.id)  as num_usuarios,
      COUNT(DISTINCT d.id)  as num_documentos,
      COUNT(DISTINCT ca.id) as num_carpetas
    FROM centros c
    LEFT JOIN usuarios u  ON u.id_centro  = c.id AND u.activo = 1
    LEFT JOIN documentos d  ON d.id_centro  = c.id
    LEFT JOIN carpetas   ca ON ca.id_centro = c.id
    GROUP BY c.id
    ORDER BY c.nombre
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({ centros, usuarios, carpetas, documentos, borradores, vigentes, generadosIA,
             porCentro, page, limit, total_centros: centros });
}

// GET /api/admin/sistema — información de almacenamiento activo
function sistemaInfo(_req, res) {
  const hostPath = process.env.HOST_DOCS_PATH || null;
  const docsPath = process.env.DOCS_PATH || '/app/data/docs';
  res.json({
    almacenamiento: hostPath
      ? { modo: 'carpeta_anfitrion', ruta_host: hostPath, ruta_contenedor: docsPath }
      : { modo: 'volumen_docker',    nombre_volumen: 'calidocs_data', ruta_contenedor: docsPath },
    cambiar: 'Edita HOST_DOCS_PATH en .env y reinicia: docker compose down && docker compose up -d --build',
  });
}

module.exports = { listCentros, createCentro, createUsuario, listUsuariosCentro, toggleUsuario, deleteUsuario, stats, sistemaInfo };
