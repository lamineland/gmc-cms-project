const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, generateToken } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');
const { sendWelcomeEmail } = require('../services/emailService');

const rounds = () => parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
const DUMMY_HASH = bcrypt.hashSync('timing-attack-protection', 10);

const signTokens = (user) => ({
  accessToken: jwt.sign({ id: user.user_id, role: user.role, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' }),
  refreshToken: jwt.sign({ id: user.user_id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }),
});

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;
  if (await User.findByLogin(email) || await User.findByLogin(username)) throw new AppError('Username or email already in use', 409);
  // Self-registration is always "subscriber"; elevated roles are granted by an admin.
  const user = await User.create({
    username, email, first_name, last_name,
    password_hash: await bcrypt.hash(password, rounds()), verification_token: generateToken(16),
  });
  sendWelcomeEmail(user);
  req.user = user;
  logActivity(req, 'user.register', 'user', user.user_id);
  res.status(201).json(successResponse({ user, ...signTokens(user) }, 'Registration successful'));
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByLogin(email);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new AppError('Invalid credentials', 401);
  if (!user.is_active) throw new AppError('Account is disabled', 403);
  await User.touchLogin(user.user_id);
  delete user.password_hash;
  delete user.verification_token;
  req.user = user;
  logActivity(req, 'user.login', 'user', user.user_id);
  res.json(successResponse({ user, ...signTokens(user) }, 'Login successful'));
});

exports.refresh = asyncHandler(async (req, res) => {
  let payload;
  try { payload = jwt.verify(req.body.refreshToken || '', process.env.JWT_REFRESH_SECRET); }
  catch (e) { throw new AppError('Invalid refresh token', 401); }
  if (payload.type !== 'refresh') throw new AppError('Invalid refresh token', 401);
  const user = await User.findById(payload.id);
  if (!user || !user.is_active) throw new AppError('Account not found or disabled', 401);
  res.json(successResponse(signTokens(user)));
});

exports.me = asyncHandler(async (req, res) => res.json(successResponse(await User.findById(req.user.user_id))));

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.updateProfile(req.user.user_id, req.body);
  logActivity(req, 'user.update_profile', 'user', user.user_id);
  res.json(successResponse(user, 'Profile updated'));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findWithHash(req.user.user_id);
  if (!(await bcrypt.compare(req.body.current_password, user.password_hash))) throw new AppError('Current password is incorrect', 400);
  await User.updatePassword(user.user_id, await bcrypt.hash(req.body.new_password, rounds()));
  logActivity(req, 'user.change_password', 'user', user.user_id);
  res.json(successResponse(null, 'Password changed'));
});
