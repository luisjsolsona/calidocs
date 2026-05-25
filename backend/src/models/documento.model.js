const db = require('../db');

const Documento = {
  findById(id) {
    return db.prepare('SELECT * FROM documentos WHERE id = ?').get(id);
  },

  listByCentro(id_centro, { estado, tipo } = {}) {
    let q = 'SELECT * FROM documentos WHERE id_centro = ?';
    const params = [id_centro];
    if (estado) { q += ' AND estado = ?'; params.push(estado); }
    if (tipo)   { q += ' AND tipo = ?';   params.push(tipo); }
    q += ' ORDER BY updated_at DESC';
    return db.prepare(q).all(...params);
  },

  listByCarpeta(id_carpeta) {
    return db.prepare(`
      SELECT * FROM documentos WHERE id_carpeta = ? ORDER BY nombre
    `).all(id_carpeta);
  },

  // Búsqueda fuzzy por nombre y código (SQLite LIKE)
  search(id_centro, texto) {
    const term = `%${texto}%`;
    return db.prepare(`
      SELECT * FROM documentos
      WHERE id_centro = ?
        AND (nombre LIKE ? OR codigo LIKE ? OR tipo LIKE ?)
      ORDER BY updated_at DESC
      LIMIT 50
    `).all(id_centro, term, term, term);
  },

  create(campos) {
    const {
      id_centro, id_carpeta, nombre, codigo, tipo, version,
      estado, extension, archivo_path, subido_por, generado_ia
    } = campos;
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO documentos
        (id_centro, id_carpeta, nombre, codigo, tipo, version, estado, extension, archivo_path, subido_por, generado_ia)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id_centro, id_carpeta ?? null, nombre, codigo ?? null, tipo ?? null,
      version ?? '1.0', estado ?? 'borrador', extension ?? null,
      archivo_path ?? null, subido_por ?? null, generado_ia ?? 0
    );
    return this.findById(lastInsertRowid);
  },

  update(id, campos) {
    const permitidos = ['nombre','codigo','tipo','version','estado','extension','archivo_path','id_carpeta'];
    const sets = Object.keys(campos).filter(k => permitidos.includes(k)).map(k => `${k} = ?`);
    if (!sets.length) return this.findById(id);
    sets.push("updated_at = datetime('now')");
    const vals = Object.keys(campos).filter(k => permitidos.includes(k)).map(k => campos[k]);
    db.prepare(`UPDATE documentos SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    return this.findById(id);
  },

  // Devuelve la ruta del archivo antes de borrar (necesaria para limpiar el disco)
  getPath(id) {
    return db.prepare('SELECT archivo_path FROM documentos WHERE id = ?').get(id)?.archivo_path;
  },

  deleteById(id) {
    db.prepare('DELETE FROM documentos WHERE id = ?').run(id);
  },
};

module.exports = Documento;
