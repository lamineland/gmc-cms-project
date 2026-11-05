const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { AppError } = require('./errorHandler');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const allowed = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf').split(',');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'application/pdf': '.pdf' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // Never trust the client-supplied name/extension: derive both from the validated MIME type.
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype] || path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new AppError(`File type ${file.mimetype} is not allowed`, 400)),
});

module.exports = { upload, uploadDir };
