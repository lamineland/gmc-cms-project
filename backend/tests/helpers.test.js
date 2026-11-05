const h = require('../src/utils/helpers');
const { sanitizeContent } = require('../src/utils/sanitize');

describe('helpers', () => {
  test('generateSlug', () => expect(h.generateSlug("Hello, World! It's Node.js")).toBe('hello-world-its-nodejs'));
  test('paginate clamps values', () => {
    expect(h.paginate(0, 1000)).toEqual({ page: 1, limit: 100, offset: 0 });
    expect(h.paginate(3, 20)).toEqual({ page: 3, limit: 20, offset: 40 });
  });
  test('getPaginationMeta', () => expect(h.getPaginationMeta(25, 2, 10)).toMatchObject({ totalPages: 3, hasNextPage: true, hasPrevPage: true }));
  test('calculateReadingTime ignores tags, min 1', () => {
    expect(h.calculateReadingTime('<p>short</p>')).toBe(1);
    expect(h.calculateReadingTime('word '.repeat(450))).toBe(3);
  });
  test('extractExcerpt strips html and truncates', () => expect(h.extractExcerpt('<p>' + 'a'.repeat(300) + '</p>', 50)).toHaveLength(53));
  test('generatePassword length', () => expect(h.generatePassword(16)).toHaveLength(16));
});

describe('sanitizeContent (XSS)', () => {
  test('removes scripts, handlers and javascript: urls', () => {
    const out = sanitizeContent('<p onclick="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">l</a><img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain('<p>a</p>');
  });
});
