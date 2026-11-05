const { query } = require('../config/database');

const PUBLIC_COLS = 'user_id, username, email, first_name, last_name, role, bio, avatar, created_at, updated_at, last_login, is_active, email_verified';

const User = {
  PUBLIC_COLS,
  findById: async (id) => (await query(`SELECT ${PUBLIC_COLS} FROM users WHERE user_id = $1`, [id])).rows[0],
  findByLogin: async (login) =>
    (await query('SELECT * FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($1)', [login])).rows[0],
  findWithHash: async (id) => (await query('SELECT * FROM users WHERE user_id = $1', [id])).rows[0],
  create: async ({ username, email, password_hash, first_name, last_name, role = 'subscriber', verification_token = null }) =>
    (await query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, verification_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${PUBLIC_COLS}`,
      [username, email, password_hash, first_name || null, last_name || null, role, verification_token]
    )).rows[0],
  touchLogin: (id) => query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [id]),
  updateProfile: async (id, { first_name, last_name, bio, avatar }) =>
    (await query(
      `UPDATE users SET first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name),
         bio = COALESCE($4, bio), avatar = COALESCE($5, avatar) WHERE user_id = $1 RETURNING ${PUBLIC_COLS}`,
      [id, first_name ?? null, last_name ?? null, bio ?? null, avatar ?? null]
    )).rows[0],
  updatePassword: (id, hash) => query('UPDATE users SET password_hash = $2 WHERE user_id = $1', [id, hash]),
  adminUpdate: async (id, { role, is_active, first_name, last_name }) =>
    (await query(
      `UPDATE users SET role = COALESCE($2, role), is_active = COALESCE($3, is_active),
         first_name = COALESCE($4, first_name), last_name = COALESCE($5, last_name)
       WHERE user_id = $1 RETURNING ${PUBLIC_COLS}`,
      [id, role ?? null, is_active ?? null, first_name ?? null, last_name ?? null]
    )).rows[0],
  remove: async (id) => (await query('DELETE FROM users WHERE user_id = $1', [id])).rowCount,
  list: async ({ search, role, limit, offset }) => {
    const params = [];
    const where = [];
    if (search) { params.push(`%${search}%`); where.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`); }
    if (role) { params.push(role); where.push(`role = $${params.length}`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = +(await query(`SELECT COUNT(*) FROM users ${w}`, params)).rows[0].count;
    params.push(limit, offset);
    const rows = (await query(
      `SELECT ${PUBLIC_COLS} FROM users ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params
    )).rows;
    return { rows, total };
  },
};
module.exports = User;
