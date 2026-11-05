const slugify = require('slugify');
const crypto = require('crypto');

const generateSlug = (text) =>
  slugify(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

/** Generate a slug, appending a random suffix if it already exists. */
const generateUniqueSlug = async (text, checkExistsCallback) => {
  let slug = generateSlug(text) || crypto.randomBytes(4).toString('hex');
  if (await checkExistsCallback(slug)) {
    slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
  }
  return slug;
};

const paginate = (page = 1, limit = parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 10) => {
  const max = parseInt(process.env.MAX_PAGE_SIZE, 10) || 100;
  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;
  if (limit > max) limit = max;
  if (limit < 1) limit = 10;
  if (page < 1) page = 1;
  return { page, limit, offset: (page - 1) * limit };
};

const getPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    currentPage: parseInt(page, 10),
    totalPages,
    totalItems,
    itemsPerPage: parseInt(limit, 10),
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

const successResponse = (data, message = 'Success') => ({ success: true, message, data });

const errorResponse = (message, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return response;
};

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const calculateReadingTime = (text = '') => {
  const words = stripHtml(text).split(/\s+/).filter(Boolean).length;
  return Math.max(Math.ceil(words / 200), 1);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '').substring(0, 1000);
};

const generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  switch (format) {
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    default: return d.toISOString();
  }
};

const extractExcerpt = (content = '', length = 200) => {
  const text = stripHtml(content);
  return text.length <= length ? text : `${text.substring(0, length).trim()}...`;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) password += charset[crypto.randomInt(charset.length)];
  return password;
};

module.exports = {
  generateSlug, generateUniqueSlug, paginate, getPaginationMeta, successResponse, errorResponse,
  calculateReadingTime, sanitizeInput, generateToken, isValidDate, formatDate, extractExcerpt,
  isValidEmail, generatePassword, stripHtml,
};
