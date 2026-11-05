const logger = require('../utils/logger');
const { errorResponse } = require('../utils/helpers');

class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const notFound = (req, res) => res.status(404).json(errorResponse(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.code === '23505') { status = 409; message = 'A record with that value already exists'; }
  else if (err.code === '23503') { status = 400; message = 'Referenced record does not exist'; }
  else if (err.code === '23514') { status = 400; message = 'Value violates a database constraint'; }
  else if (err.name === 'MulterError') { status = 400; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }
  res.status(status).json(errorResponse(message, err.errors));
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, notFound, errorHandler, asyncHandler };
