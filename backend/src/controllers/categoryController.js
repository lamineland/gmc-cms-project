const Category = require('../models/Category');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, generateUniqueSlug, generateSlug } = require('../utils/helpers');
const { remember, invalidateTaxonomy } = require('../services/cacheService');
const { hasRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

exports.list = asyncHandler(async (req, res) => {
  const all = hasRole(req.user, 'editor');
  res.json(successResponse(await remember(`categories:list:${all}`, () => Category.list({ includeInactive: all }))));
});

exports.get = asyncHandler(async (req, res) => {
  const c = await Category.findById(req.params.id);
  if (!c) throw new AppError('Category not found', 404);
  res.json(successResponse(c));
});

const checkParent = async (id, parentId) => {
  if (!parentId) return;
  if (parentId === id) throw new AppError('A category cannot be its own parent', 400);
  // walk up the ancestry to prevent cycles
  let cur = await Category.findById(parentId);
  if (!cur) throw new AppError('Parent category not found', 400);
  while (cur && cur.parent_id) {
    if (cur.parent_id === id) throw new AppError('Circular category hierarchy', 400);
    cur = await Category.findById(cur.parent_id);
  }
};

exports.create = asyncHandler(async (req, res) => {
  await checkParent(0, req.body.parent_id);
  const slug = await generateUniqueSlug(req.body.name, (s) => Category.slugExists(s));
  const c = await Category.create({ ...req.body, slug });
  await invalidateTaxonomy();
  logActivity(req, 'category.create', 'category', c.category_id, c.name);
  res.status(201).json(successResponse(c, 'Category created'));
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await Category.findById(req.params.id);
  if (!existing) throw new AppError('Category not found', 404);
  const parent_id = 'parent_id' in req.body ? req.body.parent_id : existing.parent_id;
  await checkParent(existing.category_id, parent_id);
  let slug = existing.slug;
  if (req.body.name && req.body.name !== existing.name) {
    const wanted = generateSlug(req.body.name);
    slug = wanted === existing.slug || !(await Category.slugExists(wanted, existing.category_id)) ? wanted : await generateUniqueSlug(req.body.name, (s) => Category.slugExists(s, existing.category_id));
  }
  const c = await Category.update(existing.category_id, { ...req.body, slug, parent_id });
  await invalidateTaxonomy();
  logActivity(req, 'category.update', 'category', c.category_id, c.name);
  res.json(successResponse(c, 'Category updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await Category.remove(req.params.id))) throw new AppError('Category not found', 404);
  await invalidateTaxonomy();
  logActivity(req, 'category.delete', 'category', req.params.id);
  res.json(successResponse(null, 'Category deleted'));
});
