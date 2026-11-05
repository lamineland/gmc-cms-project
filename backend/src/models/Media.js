const { query } = require('../config/database');

const Media = {
  findById: async (id) => (await query('SELECT * FROM media WHERE media_id = $1', [id])).rows[0],
  create: async (m) =>
    (await query(
      `INSERT INTO media (filename, original_name, file_path, file_type, file_size, mime_type, uploaded_by, alt_text, caption)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [m.filename, m.original_name, m.file_path, m.file_type, m.file_size, m.mime_type, m.uploaded_by, m.alt_text || null, m.caption || null]
    )).rows[0],
  update: async (id, { alt_text, caption }) =>
    (await query('UPDATE media SET alt_text = COALESCE($2,alt_text), caption = COALESCE($3,caption) WHERE media_id = $1 RETURNING *',
      [id, alt_text ?? null, caption ?? null])).rows[0],
  remove: async (id) => (await query('DELETE FROM media WHERE media_id = $1 RETURNING file_path', [id])).rows[0],
  list: async ({ type, userId, search, limit, offset }) => {
    const params = [];
    const where = [];
    if (type) { params.push(type); where.push(`file_type = $${params.length}`); }
    if (userId) { params.push(userId); where.push(`uploaded_by = $${params.length}`); }
    if (search) { params.push(`%${search}%`); where.push(`original_name ILIKE $${params.length}`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = +(await query(`SELECT COUNT(*) FROM media ${w}`, params)).rows[0].count;
    params.push(limit, offset);
    const rows = (await query(`SELECT * FROM media ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    return { rows, total };
  },
};
module.exports = Media;
