const router = require('express').Router();
const { listCentros, createCentro, createUsuario } = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRol }  = require('../middleware/roles');

const soloSuperadmin = [requireAuth, requireRol('superadmin')];

router.get('/centros',                   ...soloSuperadmin, listCentros);
router.post('/centros',                  ...soloSuperadmin, createCentro);
router.post('/centros/:id/usuarios',     ...soloSuperadmin, createUsuario);

module.exports = router;
