const router = require('express').Router();
const c = require('../controllers/categoryController');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const v = require('../middleware/validation');

router.get('/', optionalAuth, c.list);
router.get('/:id', v.idParam(), v.validate, c.get);
router.post('/', authenticate, requireRole('editor'), v.categoryRules, v.validate, c.create);
router.put('/:id', authenticate, requireRole('editor'), v.idParam(), v.categoryRules.map((r) => r.optional()), v.validate, c.update);
router.delete('/:id', authenticate, requireRole('editor'), v.idParam(), v.validate, c.remove);
module.exports = router;
