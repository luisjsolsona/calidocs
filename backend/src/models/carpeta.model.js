const db = require('../db');

const Carpeta = {
  // Árbol completo de un centro
  arbol(id_centro) {
    return db.prepare(`
      SELECT id, parent_id, nombre, codigo, orden
      FROM carpetas
      WHERE id_centro = ?
      ORDER BY orden, nombre
    `).all(id_centro);
  },

  findById(id) {
    return db.prepare('SELECT * FROM carpetas WHERE id = ?').get(id);
  },

  create({ id_centro, parent_id, nombre, codigo, orden }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO carpetas (id_centro, parent_id, nombre, codigo, orden)
      VALUES (?, ?, ?, ?, ?)
    `).run(id_centro, parent_id ?? null, nombre, codigo ?? null, orden ?? 0);
    return this.findById(lastInsertRowid);
  },

  update(id, campos) {
    const permitidos = ['nombre', 'codigo', 'parent_id', 'orden'];
    const sets = Object.keys(campos).filter(k => permitidos.includes(k)).map(k => `${k} = ?`);
    if (!sets.length) return this.findById(id);
    sets.push("updated_at = datetime('now')");
    const vals = Object.keys(campos).filter(k => permitidos.includes(k)).map(k => campos[k]);
    db.prepare(`UPDATE carpetas SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    return this.findById(id);
  },

  delete(id) {
    db.prepare('DELETE FROM carpetas WHERE id = ?').run(id);
  },
};

module.exports = Carpeta;
