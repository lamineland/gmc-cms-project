const Tag = require('../models/Tag');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, generateUniqueSlug, generateSlug } = require('../utils/helpers');
const { remember, invalidateTaxonomy } = require('../services/cacheService');
const { logActivity } = require('../utils/activity');

exports.list = asyncHandler(async (req, res) => {
  const search = req.query.search || '';
  res.json(successResponse(await remember(`tags:list:${search}`, () => Tag.list(search))));
});

exports.get = asyncHandler(async (req, res) => {
  const t = await Tag.findById(req.params.id);
  if (!t) throw new AppError('Tag not found', 404);
  res.json(successResponse(t));
});

exports.create = asyncHandler(async (req, res) => {
  const slug = generateSlug(req.body.name);
  if (await Tag.slugExists(slug)) throw new AppError('Tag already exists', 409);
  const t = await Tag.create({ ...req.body, slug });
  await invalidateTaxonomy();
  logActivity(req, 'tag.create', 'tag', t.tag_id, t.name);
  res.status(201).json(successResponse(t, 'Tag created'));
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await Tag.findById(req.params.id);
  if (!existing) throw new AppError('Tag not found', 404);
  const slug = req.body.name ? generateSlug(req.body.name) : existing.slug;
  if (slug !== existing.slug && (await Tag.slugExists(slug, existing.tag_id))) throw new AppError('Tag already exists', 409);
  const t = await Tag.update(existing.tag_id, { ...req.body, slug });
  await invalidateTaxonomy();
  logActivity(req, 'tag.update', 'tag', t.tag_id, t.name);
  res.json(successResponse(t, 'Tag updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await Tag.remove(req.params.id))) throw new AppError('Tag not found', 404);
  await invalidateTaxonomy();
  logActivity(req, 'tag.delete', 'tag', req.params.id);
  res.json(successResponse(null, 'Tag deleted'));
});
