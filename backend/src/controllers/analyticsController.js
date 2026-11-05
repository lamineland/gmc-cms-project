const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { successResponse } = require('../utils/helpers');
const { remember } = require('../services/cacheService');

exports.overview = asyncHandler(async (req, res) => {
  const data = await remember('analytics:overview', async () => {
    const [totals, byStatus, byCategory, topPosts, topAuthors, activity, daily] = await Promise.all([
      query(`SELECT (SELECT COUNT(*) FROM posts)::int AS posts,
                    (SELECT COUNT(*) FROM users)::int AS users,
                    (SELECT COUNT(*) FROM comments)::int AS comments,
                    (SELECT COUNT(*) FROM comments WHERE status = 'pending')::int AS pending_comments,
                    (SELECT COUNT(*) FROM media)::int AS media,
                    COALESCE((SELECT SUM(view_count) FROM posts), 0)::int AS total_views,
                    COALESCE((SELECT SUM(like_count) FROM posts), 0)::int AS total_likes`),
      query('SELECT status, COUNT(*)::int AS count FROM posts GROUP BY status ORDER BY status'),
      query(`SELECT c.name, get_category_post_count(c.category_id) AS posts FROM categories c ORDER BY posts DESC, c.name LIMIT 8`),
      query('SELECT post_id, title, status, view_count, like_count, comment_count, author FROM post_statistics ORDER BY view_count DESC LIMIT 5'),
      query('SELECT username, role, total_posts, published_posts, total_comments, COALESCE(total_views,0)::int AS total_views FROM user_statistics ORDER BY total_posts DESC LIMIT 5'),
      query(`SELECT a.log_id, a.action, a.entity_type, a.entity_id, a.description, a.created_at, u.username
             FROM activity_log a LEFT JOIN users u ON u.user_id = a.user_id ORDER BY a.created_at DESC LIMIT 10`),
      query(`SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(c.count, 0)::int AS posts
             FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
             LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS count FROM posts GROUP BY 1) c ON c.day = d::date ORDER BY d`),
    ]);
    return {
      totals: totals.rows[0], postsByStatus: byStatus.rows, postsByCategory: byCategory.rows,
      topPosts: topPosts.rows, topAuthors: topAuthors.rows, recentActivity: activity.rows, postsPerDay: daily.rows,
    };
  }, 30);
  res.json(successResponse(data));
});
