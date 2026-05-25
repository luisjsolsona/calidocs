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
// Body: { nombre, codigo, ... }
function createCentro(req, res, next) {
  try {
    const { nombre, codigo } = req.body;
    if (!nombre || !codigo) return res.status(400).json({ error: 'nombre y codigo son obligatorios' });

    const centro = Centro.create(req.body);

    // Carga el árbol SGC estándar para el nuevo centro
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
    const id_centro = parseInt(req.params.id);
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol)
      return res.status(400).json({ error: 'nombre, email, password y rol son obligatorios' });

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
  res.json(Usuario.findByCentro(parseInt(req.params.id)));
}

// PUT /api/admin/usuarios/:id/toggle — activa/desactiva usuario
function toggleUsuario(req, res) {
  const u = db.prepare('SELECT activo FROM usuarios WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(u.activo ? 0 : 1, req.params.id);
  res.json({ activo: !u.activo });
}

// GET /api/admin/stats — estadísticas globales
function stats(_req, res) {
  const centros   = db.prepare('SELECT COUNT(*) as n FROM centros').get().n;
  const usuarios  = db.prepare('SELECT COUNT(*) as n FROM usuarios WHERE activo = 1').get().n;
  const carpetas  = db.prepare('SELECT COUNT(*) as n FROM carpetas').get().n;
  const documentos = db.prepare('SELECT COUNT(*) as n FROM documentos').get().n;
  const borradores = db.prepare("SELECT COUNT(*) as n FROM documentos WHERE estado='borrador'").get().n;
  const vigentes   = db.prepare("SELECT COUNT(*) as n FROM documentos WHERE estado='vigente'").get().n;
  const generadosIA = db.prepare('SELECT COUNT(*) as n FROM documentos WHERE generado_ia=1').get().n;

  const porCentro = db.prepare(`
    SELECT c.id, c.nombre, c.codigo,
      COUNT(DISTINCT u.id) as num_usuarios,
      COUNT(DISTINCT d.id) as num_documentos,
      COUNT(DISTINCT ca.id) as num_carpetas
    FROM centros c
    LEFT JOIN usuarios u ON u.id_centro = c.id AND u.activo = 1
    LEFT JOIN documentos d ON d.id_centro = c.id
    LEFT JOIN carpetas ca ON ca.id_centro = c.id
    GROUP BY c.id
  `).all();

  res.json({ centros, usuarios, carpetas, documentos, borradores, vigentes, generadosIA, porCentro });
}

module.exports = { listCentros, createCentro, createUsuario, listUsuariosCentro, toggleUsuario, stats };
