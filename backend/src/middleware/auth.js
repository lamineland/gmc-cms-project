const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError, asyncHandler } = require('./errorHandler');

const ROLE_LEVEL = { subscriber: 1, author: 2, editor: 3, admin: 4 };

const loadUser = async (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (e) {
    throw new AppError(e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 401);
  }
  if (payload.type !== 'access') throw new AppError('Invalid token', 401);
  const { rows } = await query(
    'SELECT user_id, username, email, first_name, last_name, role, avatar, is_active FROM users WHERE user_id = $1',
    [payload.id]
  );
  if (!rows[0] || !rows[0].is_active) throw new AppError('Account not found or disabled', 401);
  return rows[0];
};

/** Requires a valid access token. */
const authenticate = asyncHandler(async (req, res, next) => {
  const user = await loadUser(req);
  if (!user) throw new AppError('Authentication required', 401);
  req.user = user;
  next();
});

/** Attaches req.user if a valid token is present; otherwise continues anonymously. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = (await loadUser(req)) || null;
  next();
});

/** Allows any of the listed roles (admin is always allowed). */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
  return next(new AppError('You do not have permission to perform this action', 403));
};

/** Allows the given role or anything above it. */
const requireRole = (minRole) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (ROLE_LEVEL[req.user.role] >= ROLE_LEVEL[minRole]) return next();
  return next(new AppError('You do not have permission to perform this action', 403));
};

const hasRole = (user, minRole) => !!user && ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole];

module.exports = { authenticate, optionalAuth, authorize, requireRole, hasRole, ROLE_LEVEL };
