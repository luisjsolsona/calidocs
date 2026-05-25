-- Árbol de carpetas del SGC (estructura tipo ISO 9001 para IES)
CREATE TABLE IF NOT EXISTS carpetas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  id_centro   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  parent_id   INTEGER REFERENCES carpetas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  codigo      TEXT,                -- prefijo SGC: 4.x, 5.x, 6.x, 7.x, 8.x
  orden       INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_carpetas_centro   ON carpetas(id_centro);
CREATE INDEX IF NOT EXISTS idx_carpetas_parent   ON carpetas(parent_id);

-- Repositorio de documentos
CREATE TABLE IF NOT EXISTS documentos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  id_centro   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  id_carpeta  INTEGER REFERENCES carpetas(id) ON DELETE SET NULL,
  nombre      TEXT NOT NULL,
  codigo      TEXT,               -- p.ej. f-6.2-a-01
  tipo        TEXT,               -- formato/instruccion/procedimiento/proceso/proyecto/otro
  version     TEXT DEFAULT '1.0',
  estado      TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador','vigente','obsoleto')),
  extension   TEXT,               -- pdf, docx, xlsx…
  archivo_path TEXT,              -- ruta relativa en el volumen
  subido_por  INTEGER REFERENCES usuarios(id),
  generado_ia INTEGER DEFAULT 0, -- 1 si lo generó la IA
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documentos_centro   ON documentos(id_centro);
CREATE INDEX IF NOT EXISTS idx_documentos_carpeta  ON documentos(id_carpeta);
CREATE INDEX IF NOT EXISTS idx_documentos_estado   ON documentos(estado);
