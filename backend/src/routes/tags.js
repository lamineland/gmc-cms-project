const router = require('express').Router();
const c = require('../controllers/tagController');
const { authenticate, requireRole } = require('../middleware/auth');
const v = require('../middleware/validation');

router.get('/', c.list);
router.get('/:id', v.idParam(), v.validate, c.get);
router.post('/', authenticate, requireRole('author'), v.tagRules, v.validate, c.create);
router.put('/:id', authenticate, requireRole('editor'), v.idParam(), v.tagRules.map((r) => r.optional()), v.validate, c.update);
router.delete('/:id', authenticate, requireRole('editor'), v.idParam(), v.validate, c.remove);
module.exports = router;
