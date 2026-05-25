const bcrypt = require('bcryptjs');
const { insertarArbol, ARBOL_SGC } = require('./services/carpetas.seed');

async function seed(db) {
  await seedSuperadmin(db);
  if (process.env.SEED_DEMO !== 'false') await seedDemo(db);
}

// Crea el superadmin si no existe ningún usuario con ese rol
async function seedSuperadmin(db) {
  const existe = db.prepare("SELECT id FROM usuarios WHERE rol = 'superadmin'").get();
  if (existe) return;

  const email    = process.env.SEED_ADMIN_EMAIL    || 'admin@calidocs.es';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';
  const hash     = await bcrypt.hash(password, 10);

  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, id_centro)
    VALUES ('Superadmin', ?, ?, 'superadmin', NULL)
  `).run(email, hash);

  console.log(`[Seed] Superadmin creado: ${email}`);
}

// Crea un centro demo con un usuario por cada rol si no existe ya
async function seedDemo(db) {
  const yaExiste = db.prepare("SELECT id FROM centros WHERE codigo = 'DEMO'").get();
  if (yaExiste) return;

  // Centro demo
  const { lastInsertRowid: centroId } = db.prepare(`
    INSERT INTO centros (nombre, codigo, direccion, telefono, email, año_academico)
    VALUES ('IES Demo', 'DEMO', 'Calle Mayor, 1 — 00000 Ciudad', '900 000 000', 'info@iesdemo.es', '2024-2025')
  `).run();

  // Árbol SGC estándar para el centro demo
  insertarArbol(db, centroId, ARBOL_SGC);

  // Usuarios de ejemplo — uno por cada rol
  const usuarios = [
    { nombre: 'Director Demo',       email: 'director@demo.es',   password: 'Director1234!',  rol: 'admin_centro' },
    { nombre: 'Coord. Calidad Demo', email: 'calidad@demo.es',    password: 'Calidad1234!',   rol: 'coordinador_calidad' },
    { nombre: 'Docente Demo',        email: 'docente@demo.es',    password: 'Docente1234!',   rol: 'docente' },
    { nombre: 'Invitado Demo',       email: 'invitado@demo.es',   password: 'Invitado1234!',  rol: 'invitado' },
  ];

  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    db.prepare(`
      INSERT OR IGNORE INTO usuarios (nombre, email, password_hash, rol, id_centro)
      VALUES (?, ?, ?, ?, ?)
    `).run(u.nombre, u.email, hash, u.rol, centroId);
    console.log(`[Seed Demo] ${u.rol}: ${u.email} / ${u.password}`);
  }

  console.log('[Seed Demo] Centro "IES Demo" creado con usuarios de prueba.');
  console.log('[Seed Demo] Para desactivar: añade SEED_DEMO=false al .env');
}

module.exports = seed;
