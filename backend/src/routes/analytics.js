const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/overview', authenticate, requireRole('editor'), c.overview);
module.exports = router;
