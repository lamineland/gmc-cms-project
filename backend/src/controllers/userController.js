const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, paginate, getPaginationMeta } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query.page, req.query.limit);
  const { rows, total } = await User.list({ search: req.query.search, role: req.query.role, limit, offset });
  res.json({ ...successResponse(rows), pagination: getPaginationMeta(total, page, limit) });
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json(successResponse(user));
});

exports.update = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.user_id && (req.body.role && req.body.role !== 'admin' || req.body.is_active === false))
    throw new AppError('You cannot demote or deactivate your own account', 400);
  const user = await User.adminUpdate(req.params.id, req.body);
  if (!user) throw new AppError('User not found', 404);
  logActivity(req, 'user.update', 'user', user.user_id, JSON.stringify(req.body));
  res.json(successResponse(user, 'User updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.user_id) throw new AppError('You cannot delete your own account', 400);
  if (!(await User.remove(req.params.id))) throw new AppError('User not found', 404);
  logActivity(req, 'user.delete', 'user', req.params.id);
  res.json(successResponse(null, 'User deleted'));
});
