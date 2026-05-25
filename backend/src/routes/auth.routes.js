const router = require('express').Router();
const { login, logout, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/login',  login);
router.post('/logout', logout);
router.get('/me',      requireAuth, me);

module.exports = router;
