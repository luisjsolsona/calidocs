const path = require('path');
const { generarDocumento, analizarNombre } = require('../services/ai.service');
const { generarDocx } = require('../services/docx.service');
const Documento = require('../models/documento.model');
const Centro    = require('../models/centro.model');

const DOCS_ROOT = path.resolve(process.env.DOCS_PATH || '/app/data/docs');

// POST /api/generador
// Body: { nombre, id_carpeta? }
async function generar(req, res, next) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'ANTHROPIC_API_KEY no configurada. Añádela al .env para usar el generador IA.' });
    }

    const id_centro = req.usuario.id_centro;
    const { nombre, id_carpeta } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre del documento requerido' });

    const centro = id_centro ? Centro.findById(id_centro) : null;

    // Genera contenido con Claude
    const { contenido, tipo, seccion, tokens_usados } = await generarDocumento(nombre, centro);

    // Guarda el .docx en el volumen
    const filename = `${Date.now()}_${nombre.replace(/[^a-zA-Z0-9._-]/g, '_')}.docx`;
    const carpetaId = id_carpeta || 0;
    const outputPath = path.join(DOCS_ROOT, String(id_centro || '0'), String(carpetaId), filename);
    await generarDocx(contenido, nombre, centro, outputPath);

    const relPath = path.relative(DOCS_ROOT, outputPath);

    // Guarda metadatos en la BD como borrador
    const doc = Documento.create({
      id_centro,
      id_carpeta: id_carpeta ? parseInt(id_carpeta) : null,
      nombre,
      codigo: null,
      tipo,
      version: '1.0',
      estado: 'borrador',
      extension: 'docx',
      archivo_path: relPath,
      subido_por: req.usuario.id,
      generado_ia: 1,
    });

    res.status(201).json({
      documento: doc,
      preview: contenido.slice(0, 800) + (contenido.length > 800 ? '\n\n[...]' : ''),
      tipo,
      seccion,
      tokens_usados,
    });
  } catch (err) { next(err); }
}

// GET /api/generador/analizar?nombre=...
function analizar(req, res) {
  const { nombre } = req.query;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  res.json(analizarNombre(nombre));
}

module.exports = { generar, analizar };
