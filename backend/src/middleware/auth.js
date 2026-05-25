const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Valida que el payload tenga la estructura esperada
    if (!payload.id || !payload.rol) {
      return res.status(401).json({ error: 'Token mal formado' });
    }
    req.usuario = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
}

module.exports = { requireAuth };
