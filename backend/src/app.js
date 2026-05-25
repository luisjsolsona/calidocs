require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes   = require('./routes/auth.routes');
const centroRoutes = require('./routes/centro.routes');
const adminRoutes  = require('./routes/admin.routes');

const app = express();

app.use(express.json({ limit: '5mb' }));   // 5 MB para logos en base64
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  credentials: true,                        // necesario para enviar cookies
}));

// Rutas
app.use('/api/auth',   authRoutes);
app.use('/api/centro', centroRoutes);
app.use('/api/admin',  adminRoutes);

// Health check (usado por Docker)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Manejo de errores global
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

module.exports = app;
