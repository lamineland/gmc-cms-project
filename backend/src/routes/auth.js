const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const v = require('../middleware/validation');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, v.registerRules, v.validate, c.register);
router.post('/login', authLimiter, v.loginRules, v.validate, c.login);
router.post('/refresh', c.refresh);
router.get('/me', authenticate, c.me);
router.put('/me', authenticate, v.profileRules, v.validate, c.updateMe);
router.post('/change-password', authenticate, v.changePasswordRules, v.validate, c.changePassword);
module.exports = router;
