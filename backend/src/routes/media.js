const router = require('express').Router();
const c = require('../controllers/mediaController');
const { upload } = require('../middleware/upload');
const { authenticate, requireRole } = require('../middleware/auth');
const v = require('../middleware/validation');

router.use(authenticate, requireRole('author'));
router.get('/', c.list);
router.post('/', upload.array('files', 10), c.upload);
router.put('/:id', v.idParam(), v.mediaUpdateRules, v.validate, c.update);
router.delete('/:id', v.idParam(), v.validate, c.remove);
module.exports = router;
