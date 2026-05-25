const bcrypt = require('bcryptjs');

// Crea el superadmin si no existe ningún usuario en la BD
async function seed(db) {
  const count = db.prepare('SELECT COUNT(*) as n FROM usuarios').get().n;
  if (count > 0) return;

  const email    = process.env.SEED_ADMIN_EMAIL    || 'admin@calidocs.es';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';
  const hash     = await bcrypt.hash(password, 10);

  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, id_centro)
    VALUES ('Superadmin', ?, ?, 'superadmin', NULL)
  `).run(email, hash);

  console.log(`[Seed] Superadmin creado: ${email}`);
}

module.exports = seed;
