const { query } = require('../config/database');

const SELECT = `
  SELECT p.*, u.username AS author_username, u.first_name AS author_first_name, u.last_name AS author_last_name,
         c.name AS category_name, c.slug AS category_slug,
         COALESCE((SELECT json_agg(json_build_object('tag_id', t.tag_id, 'name', t.name, 'slug', t.slug) ORDER BY t.name)
                   FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id), '[]') AS tags,
         (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.post_id AND cm.status = 'approved')::int AS comment_count
  FROM posts p
  LEFT JOIN users u ON u.user_id = p.author_id
  LEFT JOIN categories c ON c.category_id = p.category_id`;

const SORTS = {
  newest: 'COALESCE(p.published_at, p.created_at) DESC',
  oldest: 'COALESCE(p.published_at, p.created_at) ASC',
  popular: 'p.view_count DESC',
  title: 'p.title ASC',
};

const Post = {
  /** filters: {status, publishedOnly, authorId, categoryId, categorySlug, tagSlug, search, featured, sort, limit, offset} */
  list: async (f) => {
    const params = [];
    const where = [];
    const add = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };
    if (f.publishedOnly) where.push(`p.status = 'published' AND p.published_at <= CURRENT_TIMESTAMP`);
    else if (f.status && f.status !== 'all') add('p.status = ?', f.status);
    if (f.authorId) add('p.author_id = ?', f.authorId);
    if (f.categoryId) add('p.category_id = ?', f.categoryId);
    if (f.categorySlug) add('c.slug = ?', f.categorySlug);
    if (f.tagSlug) add('EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id AND t.slug = ?)', f.tagSlug);
    if (f.featured) where.push('p.is_featured = true');
    let rank = '';
    if (f.search) {
      params.push(f.search);
      const n = params.length;
      where.push(`(to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,'') || ' ' || coalesce(p.content,'')) @@ plainto_tsquery('simple', $${n})
                   OR p.title ILIKE '%' || $${n} || '%')`);
      rank = `ts_rank(to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.excerpt,'')), plainto_tsquery('simple', $${n})) DESC, `;
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = +(await query(`SELECT COUNT(*) FROM posts p LEFT JOIN categories c ON c.category_id = p.category_id ${w}`, params)).rows[0].count;
    params.push(f.limit, f.offset);
    const rows = (await query(
      `${SELECT} ${w} ORDER BY ${rank}${SORTS[f.sort] || SORTS.newest} LIMIT $${params.length - 1} OFFSET $${params.length}`, params
    )).rows;
    // list views don't need the full body
    rows.forEach((r) => { delete r.content; });
    return { rows, total };
  },
  findById: async (id) => (await query(`${SELECT} WHERE p.post_id = $1`, [id])).rows[0],
  findBySlug: async (slug) => (await query(`${SELECT} WHERE p.slug = $1`, [slug])).rows[0],
  slugExists: async (slug, excludeId = 0) =>
    (await query('SELECT 1 FROM posts WHERE slug = $1 AND post_id <> $2', [slug, excludeId])).rowCount > 0,
  incrementViews: (id) => query('UPDATE posts SET view_count = view_count + 1 WHERE post_id = $1', [id]),
  incrementLikes: async (id) => (await query('UPDATE posts SET like_count = like_count + 1 WHERE post_id = $1 RETURNING like_count', [id])).rows[0],
  related: async (id, limit = 4) =>
    (await query(
      `SELECT p.post_id, p.title, p.slug, p.excerpt, p.featured_image, p.published_at,
              COUNT(pt2.tag_id) AS shared
       FROM posts p
       LEFT JOIN post_tags pt2 ON pt2.post_id = p.post_id AND pt2.tag_id IN (SELECT tag_id FROM post_tags WHERE post_id = $1)
       WHERE p.post_id <> $1 AND p.status = 'published'
       GROUP BY p.post_id ORDER BY shared DESC, p.published_at DESC LIMIT $2`, [id, limit]
    )).rows,

  insert: async (client, p) =>
    (await client.query(
      `INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, featured_image, published_at,
         meta_title, meta_description, meta_keywords, is_featured, allow_comments, reading_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING post_id`,
      [p.title, p.slug, p.content, p.excerpt, p.author_id, p.category_id, p.status, p.featured_image, p.published_at,
        p.meta_title, p.meta_description, p.meta_keywords, p.is_featured, p.allow_comments, p.reading_time]
    )).rows[0].post_id,
  update: async (client, id, p) =>
    client.query(
      `UPDATE posts SET title=$2, slug=$3, content=$4, excerpt=$5, category_id=$6, status=$7, featured_image=$8,
         published_at=$9, meta_title=$10, meta_description=$11, meta_keywords=$12, is_featured=$13,
         allow_comments=$14, reading_time=$15 WHERE post_id=$1`,
      [id, p.title, p.slug, p.content, p.excerpt, p.category_id, p.status, p.featured_image, p.published_at,
        p.meta_title, p.meta_description, p.meta_keywords, p.is_featured, p.allow_comments, p.reading_time]
    ),
  setTags: async (client, postId, tagIds) => {
    await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
    for (const tagId of tagIds) await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, tagId]);
  },
  remove: async (id) => (await query('DELETE FROM posts WHERE post_id = $1', [id])).rowCount,

  // versions
  addVersion: async (client, post, editedBy, note) =>
    client.query(
      `INSERT INTO post_versions (post_id, version_number, title, content, excerpt, status, edited_by, change_note)
       VALUES ($1, COALESCE((SELECT MAX(version_number) FROM post_versions WHERE post_id = $1), 0) + 1, $2,$3,$4,$5,$6,$7)`,
      [post.post_id, post.title, post.content, post.excerpt, post.status, editedBy, note || null]
    ),
  versions: async (postId) =>
    (await query(
      `SELECT v.version_id, v.version_number, v.title, v.status, v.change_note, v.created_at, u.username AS edited_by_username
       FROM post_versions v LEFT JOIN users u ON u.user_id = v.edited_by WHERE v.post_id = $1 ORDER BY v.version_number DESC`, [postId]
    )).rows,
  version: async (postId, versionId) =>
    (await query('SELECT * FROM post_versions WHERE post_id = $1 AND version_id = $2', [postId, versionId])).rows[0],
};
module.exports = Post;
