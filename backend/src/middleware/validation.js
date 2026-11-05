const { body, param, query: q, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(422).json(errorResponse('Validation failed', errors));
};

const idParam = (name = 'id') => param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`).toInt();

const registerRules = [
  body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username must be 3-50 chars (letters, digits, _ . -)'),
  body('email').trim().isEmail().normalizeEmail().isLength({ max: 100 }),
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
  body('first_name').optional().trim().isLength({ max: 50 }),
  body('last_name').optional().trim().isLength({ max: 50 }),
];
const loginRules = [
  body('email').trim().notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];
const profileRules = [
  body('first_name').optional().trim().isLength({ max: 50 }),
  body('last_name').optional().trim().isLength({ max: 50 }),
  body('bio').optional().isLength({ max: 2000 }),
  body('avatar').optional({ nullable: true }).isLength({ max: 255 }),
];
const changePasswordRules = [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
];

const postRules = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255)'),
  body('content').isString().notEmpty().withMessage('Content is required'),
  body('excerpt').optional({ nullable: true }).isString(),
  body('category_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('featured_image').optional({ nullable: true }).isLength({ max: 255 }),
  body('meta_title').optional({ nullable: true }).isLength({ max: 255 }),
  body('meta_description').optional({ nullable: true }).isString(),
  body('meta_keywords').optional({ nullable: true }).isString(),
  body('is_featured').optional().isBoolean().toBoolean(),
  body('allow_comments').optional().isBoolean().toBoolean(),
  body('tags').optional().isArray({ max: 20 }),
];
const postUpdateRules = postRules.map((r) => r.optional());
const postListRules = [
  q('page').optional().isInt({ min: 1 }),
  q('limit').optional().isInt({ min: 1 }),
  q('status').optional().isIn(['draft', 'published', 'archived', 'all']),
  q('sort').optional().isIn(['newest', 'oldest', 'popular', 'title']),
];

const categoryRules = [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional({ nullable: true }).isString(),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('display_order').optional().isInt().toInt(),
  body('is_active').optional().isBoolean().toBoolean(),
];
const tagRules = [
  body('name').trim().isLength({ min: 1, max: 50 }),
  body('description').optional({ nullable: true }).isString(),
];
const commentRules = [
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Comment must be 1-5000 characters'),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];
const commentStatusRules = [body('status').isIn(['pending', 'approved', 'spam', 'trash'])];
const mediaUpdateRules = [
  body('alt_text').optional({ nullable: true }).isLength({ max: 255 }),
  body('caption').optional({ nullable: true }).isString(),
];
const userUpdateRules = [
  body('role').optional().isIn(['admin', 'editor', 'author', 'subscriber']),
  body('is_active').optional().isBoolean().toBoolean(),
  body('first_name').optional().trim().isLength({ max: 50 }),
  body('last_name').optional().trim().isLength({ max: 50 }),
];

module.exports = {
  validate, idParam, registerRules, loginRules, profileRules, changePasswordRules, postRules, postUpdateRules,
  postListRules, categoryRules, tagRules, commentRules, commentStatusRules, mediaUpdateRules, userUpdateRules,
};
