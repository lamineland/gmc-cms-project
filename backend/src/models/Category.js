const { query } = require('../config/database');

const Category = {
  list: async ({ includeInactive = false } = {}) =>
    (await query(
      `SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.category_id AND p.status = 'published')::int AS post_count
       FROM categories c ${includeInactive ? '' : 'WHERE c.is_active = true'} ORDER BY c.display_order, c.name`
    )).rows,
  findById: async (id) => (await query('SELECT * FROM categories WHERE category_id = $1', [id])).rows[0],
  slugExists: async (slug, excludeId = 0) =>
    (await query('SELECT 1 FROM categories WHERE slug = $1 AND category_id <> $2', [slug, excludeId])).rowCount > 0,
  create: async ({ name, slug, description, parent_id, display_order = 0, is_active = true }) =>
    (await query(
      `INSERT INTO categories (name, slug, description, parent_id, display_order, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, slug, description || null, parent_id || null, display_order, is_active]
    )).rows[0],
  update: async (id, f) =>
    (await query(
      `UPDATE categories SET name = COALESCE($2,name), slug = COALESCE($3,slug), description = COALESCE($4,description),
         parent_id = $5, display_order = COALESCE($6,display_order), is_active = COALESCE($7,is_active)
       WHERE category_id = $1 RETURNING *`,
      [id, f.name ?? null, f.slug ?? null, f.description ?? null, f.parent_id ?? null, f.display_order ?? null, f.is_active ?? null]
    )).rows[0],
  remove: async (id) => (await query('DELETE FROM categories WHERE category_id = $1', [id])).rowCount,
};
module.exports = Category;
