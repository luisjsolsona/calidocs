const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,   // 8 horas en ms
};

// POST /api/auth/login
// Body: { email, password }
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const usuario = Usuario.findByEmail(email);
    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const payload = { id: usuario.id, rol: usuario.rol, id_centro: usuario.id_centro };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    res.cookie('token', token, COOKIE_OPTS);
    res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, id_centro: usuario.id_centro });
  } catch (err) { next(err); }
}

// POST /api/auth/logout
function logout(_req, res) {
  res.clearCookie('token');
  res.json({ ok: true });
}

// GET /api/auth/me
function me(req, res) {
  const u = Usuario.findById(req.usuario.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(u);
}

module.exports = { login, logout, me };
