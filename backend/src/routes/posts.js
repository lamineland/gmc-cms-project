const router = require('express').Router();
const c = require('../controllers/postController');
const comments = require('../controllers/commentController');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const v = require('../middleware/validation');

router.get('/', optionalAuth, v.postListRules, v.validate, c.list);
router.post('/', authenticate, requireRole('author'), v.postRules, v.validate, c.create);

// comments nested under a post
router.get('/:postId(\\d+)/comments', comments.listForPost);
router.post('/:postId(\\d+)/comments', authenticate, v.commentRules, v.validate, comments.create);

router.get('/:id(\\d+)/versions', authenticate, requireRole('author'), c.versions);
router.get('/:id(\\d+)/versions/:versionId(\\d+)', authenticate, requireRole('author'), c.version);
router.post('/:id(\\d+)/versions/:versionId(\\d+)/restore', authenticate, requireRole('author'), c.restoreVersion);
router.post('/:id(\\d+)/like', authenticate, c.like);
router.put('/:id(\\d+)', authenticate, requireRole('author'), v.idParam(), v.postUpdateRules, v.validate, c.update);
router.delete('/:id(\\d+)', authenticate, requireRole('author'), c.remove);

router.get('/:idOrSlug', optionalAuth, c.get);
module.exports = router;
