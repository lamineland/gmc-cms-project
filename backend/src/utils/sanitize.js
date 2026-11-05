const sanitizeHtml = require('sanitize-html');

// Rich-text allow-list: keeps editor output, drops scripts / event handlers / javascript: URLs.
const options = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'figure', 'figcaption', 'u', 's', 'span'],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
};

module.exports = { sanitizeContent: (html) => sanitizeHtml(html || '', options), sanitizeText: (t) => sanitizeHtml(t || '', { allowedTags: [], allowedAttributes: {} }) };
