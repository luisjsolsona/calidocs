const router = require('express').Router();
const multer = require('multer');
const os     = require('os');
const ctrl   = require('../controllers/documento.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRol }  = require('../middleware/roles');

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/',              requireAuth, ctrl.listDocumentos);
router.get('/buscar',        requireAuth, ctrl.buscarDocumentos);
router.post('/',             requireAuth, requireRol('coordinador_calidad'), upload.single('archivo'), ctrl.uploadDocumento);
router.get('/:id/descargar', requireAuth, ctrl.descargarDocumento);
router.put('/:id',           requireAuth, requireRol('coordinador_calidad'), ctrl.updateDocumento);
router.delete('/:id',        requireAuth, requireRol('coordinador_calidad'), ctrl.deleteDocumento);

module.exports = router;
