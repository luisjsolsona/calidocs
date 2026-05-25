const router = require('express').Router();
const ctrl = require('../controllers/carpeta.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRol }  = require('../middleware/roles');

router.get('/',           requireAuth, ctrl.getArbol);
router.get('/script',     requireAuth, ctrl.getScript);
router.post('/reset',     requireAuth, requireRol('admin_centro'), ctrl.resetArbol);
router.post('/',          requireAuth, requireRol('coordinador_calidad'), ctrl.createCarpeta);
router.put('/:id',        requireAuth, requireRol('coordinador_calidad'), ctrl.updateCarpeta);
router.delete('/:id',     requireAuth, requireRol('coordinador_calidad'), ctrl.deleteCarpeta);

module.exports = router;
