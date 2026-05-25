const db = require('../db');

const Usuario = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);
  },

  findById(id) {
    return db.prepare('SELECT id, nombre, email, rol, id_centro, activo FROM usuarios WHERE id = ?').get(id);
  },

  findByCentro(id_centro) {
    return db.prepare(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id_centro = ?'
    ).all(id_centro);
  },

  create({ nombre, email, password_hash, rol, id_centro }) {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, id_centro)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre, email, password_hash, rol, id_centro ?? null);
    return this.findById(lastInsertRowid);
  },
};

module.exports = Usuario;
