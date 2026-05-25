const path = require('path');
const fs   = require('fs');
const Documento = require('../models/documento.model');

const DOCS_ROOT = path.resolve(process.env.DOCS_PATH || '/app/data/docs');

// Previene path traversal: la ruta final debe estar dentro de DOCS_ROOT
function isSafePath(relativePath) {
  if (!relativePath) return false;
  const resolved = path.resolve(path.join(DOCS_ROOT, relativePath));
  return resolved.startsWith(DOCS_ROOT + path.sep) || resolved === DOCS_ROOT;
}

function docsDir(id_centro, id_carpeta) {
  const dir = path.join(DOCS_ROOT, String(id_centro), String(id_carpeta ?? '0'));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// GET /api/documentos?carpeta=&estado=&tipo=
function listDocumentos(req, res) {
  const id_centro = req.usuario.id_centro;
  if (!id_centro) return res.status(403).json({ error: 'Sin centro asignado' });

  const { carpeta, estado, tipo } = req.query;

  if (carpeta !== undefined) {
    const carpetaId = parseInt(carpeta, 10);
    if (isNaN(carpetaId)) return res.status(400).json({ error: 'id de carpeta inválido' });
    return res.json(Documento.listByCarpeta(carpetaId, id_centro));
  }

  res.json(Documento.listByCentro(id_centro, { estado, tipo }));
}

// GET /api/documentos/buscar?q=texto
function buscarDocumentos(req, res) {
  const id_centro = req.usuario.id_centro;
  const texto = req.query.q || '';
  if (!texto.trim()) return res.json([]);
  res.json(Documento.search(id_centro, texto));
}

// POST /api/documentos — subida de archivo (multipart/form-data)
function uploadDocumento(req, res, next) {
  try {
    const id_centro = req.usuario.id_centro;
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

    const { nombre, id_carpeta, codigo, tipo, version, estado } = req.body;
    const extension = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    const dir      = docsDir(id_centro, id_carpeta);
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(dir, fileName);
    fs.renameSync(req.file.path, filePath);

    const relPath     = path.relative(DOCS_ROOT, filePath);
    const nombreFinal = nombre || req.file.originalname;

    const doc = Documento.create({
      id_centro,
      id_carpeta: id_carpeta ? parseInt(id_carpeta, 10) : null,
      nombre:     nombreFinal,
      codigo:     codigo || null,
      // Usa el tipo enviado por el formulario; si no, lo detecta por nombre
      tipo:       tipo   || detectarTipo(nombreFinal),
      version:    version || '1.0',
      estado:     estado  || 'borrador',
      extension,
      archivo_path: relPath,
      subido_por:   req.usuario.id,
      generado_ia:  0,
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
}

// GET /api/documentos/:id/descargar
function descargarDocumento(req, res, next) {
  try {
    const doc = Documento.findById(req.params.id);
    if (!doc || doc.id_centro !== req.usuario.id_centro)
      return res.status(404).json({ error: 'Documento no encontrado' });

    // Protección contra path traversal
    if (!isSafePath(doc.archivo_path))
      return res.status(400).json({ error: 'Ruta de archivo inválida' });

    const filePath = path.join(DOCS_ROOT, doc.archivo_path);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });

    res.download(filePath, `${doc.nombre}.${doc.extension}`);
  } catch (err) { next(err); }
}

// PUT /api/documentos/:id
function updateDocumento(req, res, next) {
  try {
    const doc = Documento.findById(req.params.id);
    if (!doc || doc.id_centro !== req.usuario.id_centro)
      return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(Documento.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

// DELETE /api/documentos/:id
function deleteDocumento(req, res, next) {
  try {
    const doc = Documento.findById(req.params.id);
    if (!doc || doc.id_centro !== req.usuario.id_centro)
      return res.status(404).json({ error: 'Documento no encontrado' });

    if (doc.archivo_path && isSafePath(doc.archivo_path)) {
      const filePath = path.join(DOCS_ROOT, doc.archivo_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    Documento.deleteById(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

function detectarTipo(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.startsWith('f-'))    return 'formato';
  if (n.startsWith('i-'))    return 'instruccion';
  if (n.startsWith('p-'))    return 'procedimiento';
  if (n.startsWith('prs-'))  return 'proceso';
  if (n.startsWith('pf'))    return 'proyecto';
  if (n.startsWith('anexo')) return 'anexo';
  return 'otro';
}

module.exports = { listDocumentos, buscarDocumentos, uploadDocumento, descargarDocumento, updateDocumento, deleteDocumento };
