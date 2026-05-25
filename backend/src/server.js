require('dotenv').config();
const app = require('./app');
const db  = require('./db');      // ejecuta migraciones al importar
const seed = require('./seed');

const PORT = process.env.PORT || 3000;

seed(db).then(() => {
  app.listen(PORT, () => {
    console.log(`[CaliDocs] Backend escuchando en puerto ${PORT}`);
  });
}).catch(err => {
  console.error('[CaliDocs] Error en arranque:', err);
  process.exit(1);
});
