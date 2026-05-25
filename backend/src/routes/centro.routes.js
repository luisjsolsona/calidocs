const router = require('express').Router();
const { getCentro, updateCentro } = require('../controllers/centro.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRol }  = require('../middleware/roles');

router.get('/', requireAuth, getCentro);
router.put('/', requireAuth, requireRol('admin_centro'), updateCentro);

module.exports = router;
