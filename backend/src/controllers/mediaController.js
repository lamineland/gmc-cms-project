const fs = require('fs');
const path = require('path');
const Media = require('../models/Media');
const { uploadDir } = require('../middleware/upload');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, paginate, getPaginationMeta } = require('../utils/helpers');
const { sanitizeText } = require('../utils/sanitize');
const { hasRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const withUrl = (m) => ({ ...m, url: `/uploads/${m.filename}` });

exports.upload = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw new AppError('No file uploaded (field name: "files")', 400);
  const created = [];
  for (const f of req.files) {
    created.push(withUrl(await Media.create({
      filename: f.filename, original_name: sanitizeText(f.originalname).slice(0, 255),
      file_path: `uploads/${f.filename}`, file_type: f.mimetype.startsWith('image/') ? 'image' : 'document',
      file_size: f.size, mime_type: f.mimetype, uploaded_by: req.user.user_id,
      alt_text: req.body.alt_text, caption: req.body.caption,
    })));
  }
  logActivity(req, 'media.upload', 'media', created[0].media_id, `${created.length} file(s)`);
  res.status(201).json(successResponse(created, 'Upload successful'));
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query.page, req.query.limit || 24);
  const { rows, total } = await Media.list({
    type: req.query.type, search: req.query.search, limit, offset,
    userId: hasRole(req.user, 'editor') ? undefined : req.user.user_id, // authors see only their own uploads
  });
  res.json({ ...successResponse(rows.map(withUrl)), pagination: getPaginationMeta(total, page, limit) });
});

const loadOwned = async (req) => {
  const m = await Media.findById(req.params.id);
  if (!m) throw new AppError('Media not found', 404);
  if (!hasRole(req.user, 'editor') && m.uploaded_by !== req.user.user_id) throw new AppError('You can only modify your own uploads', 403);
  return m;
};

exports.update = asyncHandler(async (req, res) => {
  const m = await loadOwned(req);
  res.json(successResponse(withUrl(await Media.update(m.media_id, req.body)), 'Media updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const m = await loadOwned(req);
  await Media.remove(m.media_id);
  fs.promises.unlink(path.join(uploadDir, path.basename(m.filename))).catch(() => {});
  logActivity(req, 'media.delete', 'media', m.media_id, m.original_name);
  res.json(successResponse(null, 'Media deleted'));
});
