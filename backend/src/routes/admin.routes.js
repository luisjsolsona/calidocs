const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRol }  = require('../middleware/roles');

const sa = [requireAuth, requireRol('superadmin')];

router.get('/stats',                      ...sa, ctrl.stats);
router.get('/centros',                    ...sa, ctrl.listCentros);
router.post('/centros',                   ...sa, ctrl.createCentro);
router.get('/centros/:id/usuarios',       ...sa, ctrl.listUsuariosCentro);
router.post('/centros/:id/usuarios',      ...sa, ctrl.createUsuario);
router.put('/usuarios/:id/toggle',        ...sa, ctrl.toggleUsuario);
router.delete('/usuarios/:id',            ...sa, ctrl.deleteUsuario);

module.exports = router;
