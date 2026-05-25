const jwt = require('jsonwebtoken');

// Verifica el JWT en la cookie httpOnly 'token'
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
}

module.exports = { requireAuth };
