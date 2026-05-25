const Centro = require('../models/centro.model');

// GET /api/centro
// Devuelve la config del centro del usuario autenticado
function getCentro(req, res) {
  const id = req.usuario.id_centro;
  if (!id) return res.status(404).json({ error: 'Sin centro asignado' });

  const centro = Centro.findById(id);
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
  res.json(centro);
}

// PUT /api/centro
// Body: campos a actualizar (nombre, codigo, logo_base64, direccion, telefono, email, año_academico)
function updateCentro(req, res, next) {
  try {
    const id = req.usuario.id_centro;
    if (!id) return res.status(403).json({ error: 'Sin centro asignado' });

    const actualizado = Centro.update(id, req.body);
    res.json(actualizado);
  } catch (err) { next(err); }
}

module.exports = { getCentro, updateCentro };
