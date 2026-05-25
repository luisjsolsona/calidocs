const router = require('express').Router();
const ctrl = require('../controllers/generador.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRol }  = require('../middleware/roles');

router.get('/analizar', requireAuth, ctrl.analizar);
router.post('/',        requireAuth, requireRol('coordinador_calidad'), ctrl.generar);

module.exports = router;
