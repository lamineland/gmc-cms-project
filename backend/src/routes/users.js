const router = require('express').Router();
const c = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const v = require('../middleware/validation');

router.use(authenticate, authorize()); // admin only
router.get('/', c.list);
router.get('/:id', v.idParam(), v.validate, c.get);
router.put('/:id', v.idParam(), v.userUpdateRules, v.validate, c.update);
router.delete('/:id', v.idParam(), v.validate, c.remove);
module.exports = router;
