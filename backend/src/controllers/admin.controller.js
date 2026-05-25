const bcrypt  = require('bcryptjs');
const Centro  = require('../models/centro.model');
const Usuario = require('../models/usuario.model');

// GET /api/admin/centros
function listCentros(_req, res) {
  res.json(Centro.findAll());
}

// POST /api/admin/centros
// Body: { nombre, codigo, logo_base64?, direccion?, telefono?, email?, año_academico? }
function createCentro(req, res, next) {
  try {
    const { nombre, codigo } = req.body;
    if (!nombre || !codigo) return res.status(400).json({ error: 'nombre y codigo son obligatorios' });

    const centro = Centro.create(req.body);
    res.status(201).json(centro);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'El código de centro ya existe' });
    next(err);
  }
}

// POST /api/admin/centros/:id/usuarios
// Body: { nombre, email, password, rol }
async function createUsuario(req, res, next) {
  try {
    const id_centro = parseInt(req.params.id);
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'nombre, email, password y rol son obligatorios' });
    }

    const rolesValidos = ['admin_centro', 'coordinador_calidad', 'docente', 'invitado'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Válidos: ${rolesValidos.join(', ')}` });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const usuario = Usuario.create({ nombre, email, password_hash, rol, id_centro });
    res.status(201).json(usuario);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'El email ya está registrado' });
    next(err);
  }
}

module.exports = { listCentros, createCentro, createUsuario };
