// Jerarquía de roles: superadmin > admin_centro > coordinador_calidad > docente > invitado
const NIVEL = {
  superadmin:          5,
  admin_centro:        4,
  coordinador_calidad: 3,
  docente:             2,
  invitado:            1,
};

// Permite acceso si el rol del usuario tiene nivel >= al rol requerido
function requireRol(rolMinimo) {
  return (req, res, next) => {
    const nivelUsuario   = NIVEL[req.usuario?.rol] ?? 0;
    const nivelRequerido = NIVEL[rolMinimo]         ?? 99;

    if (nivelUsuario >= nivelRequerido) return next();
    res.status(403).json({ error: 'Permisos insuficientes' });
  };
}

module.exports = { requireRol };
