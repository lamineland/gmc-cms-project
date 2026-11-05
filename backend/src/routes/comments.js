const router = require('express').Router();
const c = require('../controllers/commentController');
const { authenticate, requireRole } = require('../middleware/auth');
const v = require('../middleware/validation');

router.get('/', authenticate, requireRole('editor'), c.moderationList);
router.put('/:id/status', authenticate, requireRole('editor'), v.idParam(), v.commentStatusRules, v.validate, c.setStatus);
router.delete('/:id', authenticate, v.idParam(), v.validate, c.remove);
module.exports = router;
