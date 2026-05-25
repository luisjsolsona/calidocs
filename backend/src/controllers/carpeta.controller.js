const Carpeta = require('../models/carpeta.model');
const { insertarArbol } = require('../services/carpetas.seed');
const db = require('../db');

// GET /api/carpetas — árbol completo del centro
function getArbol(req, res) {
  const id_centro = req.usuario.id_centro;
  if (!id_centro) return res.status(403).json({ error: 'Sin centro asignado' });
  res.json(Carpeta.arbol(id_centro));
}

// POST /api/carpetas
function createCarpeta(req, res, next) {
  try {
    const id_centro = req.usuario.id_centro;
    const { nombre, parent_id, codigo, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
    const c = Carpeta.create({ id_centro, parent_id, nombre, codigo, orden });
    res.status(201).json(c);
  } catch (err) { next(err); }
}

// PUT /api/carpetas/:id
function updateCarpeta(req, res, next) {
  try {
    const c = Carpeta.findById(req.params.id);
    if (!c || c.id_centro !== req.usuario.id_centro)
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    res.json(Carpeta.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

// DELETE /api/carpetas/:id
function deleteCarpeta(req, res, next) {
  try {
    const c = Carpeta.findById(req.params.id);
    if (!c || c.id_centro !== req.usuario.id_centro)
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    Carpeta.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/carpetas/reset — recarga el árbol SGC estándar (borra el existente)
function resetArbol(req, res, next) {
  try {
    const id_centro = req.usuario.id_centro;
    // Desvincula documentos para no dejar FKs rotas
    db.prepare('UPDATE documentos SET id_carpeta = NULL WHERE id_centro = ?').run(id_centro);
    db.prepare('DELETE FROM carpetas WHERE id_centro = ?').run(id_centro);
    insertarArbol(db, id_centro, require('../services/carpetas.seed').ARBOL_SGC);
    res.json({ ok: true, arbol: Carpeta.arbol(id_centro) });
  } catch (err) { next(err); }
}

// GET /api/carpetas/script?tipo=bash|ps — genera script de creación de carpetas
function getScript(req, res) {
  const id_centro = req.usuario.id_centro;
  const nodos = Carpeta.arbol(id_centro);
  const tipo = req.query.tipo === 'ps' ? 'ps' : 'bash';

  // Reconstruye rutas completas desde el árbol plano
  const map = {};
  nodos.forEach(n => { map[n.id] = n; });
  function ruta(n, visitados = new Set()) {
    if (visitados.has(n.id)) return n.nombre;
    visitados.add(n.id);
    if (!n.parent_id || !map[n.parent_id]) return n.nombre;
    return ruta(map[n.parent_id], visitados) + '/' + n.nombre;
  }

  const rutas = nodos.map(n => ruta(n));

  let script;
  if (tipo === 'bash') {
    script = '#!/bin/bash\n# Estructura SGC — generado por CaliDocs\n\n'
      + rutas.map(r => `mkdir -p "${r}"`).join('\n');
  } else {
    script = '# Estructura SGC — generado por CaliDocs\n\n'
      + rutas.map(r => `New-Item -ItemType Directory -Force -Path "${r}"`).join('\n');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="estructura-sgc.${tipo === 'ps' ? 'ps1' : 'sh'}"`);
  res.send(script);
}

module.exports = { getArbol, createCarpeta, updateCarpeta, deleteCarpeta, resetArbol, getScript };
