require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes      = require('./routes/auth.routes');
const centroRoutes    = require('./routes/centro.routes');
const carpetaRoutes   = require('./routes/carpeta.routes');
const documentoRoutes = require('./routes/documento.routes');
const generadorRoutes = require('./routes/generador.routes');
const adminRoutes     = require('./routes/admin.routes');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  credentials: true,
}));

app.use('/api/auth',       authRoutes);
app.use('/api/centro',     centroRoutes);
app.use('/api/carpetas',   carpetaRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/generador',  generadorRoutes);
app.use('/api/admin',      adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0' }));

app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
