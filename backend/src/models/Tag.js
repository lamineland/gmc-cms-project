const { query } = require('../config/database');

const Tag = {
  list: async (search) =>
    (await query(
      `SELECT t.*, (SELECT COUNT(*) FROM post_tags pt JOIN posts p ON p.post_id = pt.post_id
                    WHERE pt.tag_id = t.tag_id AND p.status = 'published')::int AS post_count
       FROM tags t ${search ? 'WHERE t.name ILIKE $1' : ''} ORDER BY t.name`,
      search ? [`%${search}%`] : []
    )).rows,
  findById: async (id) => (await query('SELECT * FROM tags WHERE tag_id = $1', [id])).rows[0],
  slugExists: async (slug, excludeId = 0) =>
    (await query('SELECT 1 FROM tags WHERE slug = $1 AND tag_id <> $2', [slug, excludeId])).rowCount > 0,
  create: async ({ name, slug, description }) =>
    (await query('INSERT INTO tags (name, slug, description) VALUES ($1,$2,$3) RETURNING *', [name, slug, description || null])).rows[0],
  update: async (id, { name, slug, description }) =>
    (await query(
      'UPDATE tags SET name = COALESCE($2,name), slug = COALESCE($3,slug), description = COALESCE($4,description) WHERE tag_id = $1 RETURNING *',
      [id, name ?? null, slug ?? null, description ?? null]
    )).rows[0],
  remove: async (id) => (await query('DELETE FROM tags WHERE tag_id = $1', [id])).rowCount,
  /** Resolve a list of names/ids to tag ids, creating missing tags by name. */
  resolveIds: async (client, items, slugify) => {
    const ids = [];
    for (const item of items || []) {
      if (Number.isInteger(item)) { ids.push(item); continue; }
      const name = String(item).trim().slice(0, 50);
      if (!name) continue;
      const slug = slugify(name);
      const { rows } = await client.query(
        `INSERT INTO tags (name, slug) VALUES ($1,$2)
         ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING tag_id`, [name, slug]
      );
      ids.push(rows[0].tag_id);
    }
    return [...new Set(ids)];
  },
};
module.exports = Tag;
