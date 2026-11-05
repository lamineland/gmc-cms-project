const { query } = require('../config/database');

const Comment = {
  findById: async (id) => (await query('SELECT * FROM comments WHERE comment_id = $1', [id])).rows[0],
  forPost: async (postId) =>
    (await query(
      `SELECT c.comment_id, c.post_id, c.parent_id, c.content, c.created_at, c.user_id,
              u.username, u.first_name, u.last_name, u.avatar
       FROM comments c LEFT JOIN users u ON u.user_id = c.user_id
       WHERE c.post_id = $1 AND c.status = 'approved' ORDER BY c.created_at ASC`, [postId]
    )).rows,
  create: async ({ post_id, user_id, parent_id, content, status, ip_address, user_agent }) =>
    (await query(
      `INSERT INTO comments (post_id, user_id, parent_id, content, status, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [post_id, user_id, parent_id || null, content, status, ip_address, user_agent]
    )).rows[0],
  setStatus: async (id, status) => (await query('UPDATE comments SET status = $2 WHERE comment_id = $1 RETURNING *', [id, status])).rows[0],
  remove: async (id) => (await query('DELETE FROM comments WHERE comment_id = $1', [id])).rowCount,
  list: async ({ status, limit, offset }) => {
    const params = [];
    let w = '';
    if (status) { params.push(status); w = `WHERE c.status = $1`; }
    const total = +(await query(`SELECT COUNT(*) FROM comments c ${w}`, params)).rows[0].count;
    params.push(limit, offset);
    const rows = (await query(
      `SELECT c.*, u.username, p.title AS post_title, p.slug AS post_slug
       FROM comments c LEFT JOIN users u ON u.user_id = c.user_id LEFT JOIN posts p ON p.post_id = c.post_id
       ${w} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params
    )).rows;
    return { rows, total };
  },
};
module.exports = Comment;
