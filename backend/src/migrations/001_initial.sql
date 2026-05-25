-- Tabla de centros educativos
CREATE TABLE IF NOT EXISTS centros (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  codigo         TEXT UNIQUE NOT NULL,
  logo_base64    TEXT,
  direccion      TEXT,
  telefono       TEXT,
  email          TEXT,
  año_academico  TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_centro      INTEGER REFERENCES centros(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  rol            TEXT NOT NULL CHECK(rol IN ('superadmin','admin_centro','coordinador_calidad','docente','invitado')),
  activo         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Índices de uso frecuente
CREATE INDEX IF NOT EXISTS idx_usuarios_email    ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_centro   ON usuarios(id_centro);
