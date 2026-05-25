const db = require('../db');

const Centro = {
  findById(id) {
    return db.prepare('SELECT * FROM centros WHERE id = ?').get(id);
  },

  findAll() {
    return db.prepare('SELECT id, nombre, codigo, email, año_academico, created_at FROM centros').all();
  },

  create({ nombre, codigo, logo_base64, direccion, telefono, email, año_academico }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO centros (nombre, codigo, logo_base64, direccion, telefono, email, año_academico)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nombre, codigo, logo_base64 ?? null, direccion ?? null, telefono ?? null, email ?? null, año_academico ?? null);
    return this.findById(lastInsertRowid);
  },

  update(id, campos) {
    const permitidos = ['nombre', 'codigo', 'logo_base64', 'direccion', 'telefono', 'email', 'año_academico'];
    const sets = Object.keys(campos)
      .filter(k => permitidos.includes(k))
      .map(k => `${k} = ?`);

    if (sets.length === 0) return this.findById(id);

    sets.push("updated_at = datetime('now')");
    const valores = Object.keys(campos)
      .filter(k => permitidos.includes(k))
      .map(k => campos[k]);

    db.prepare(`UPDATE centros SET ${sets.join(', ')} WHERE id = ?`).run(...valores, id);
    return this.findById(id);
  },
};

module.exports = Centro;
