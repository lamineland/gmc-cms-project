const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, paginate, getPaginationMeta } = require('../utils/helpers');
const { sanitizeText } = require('../utils/sanitize');
const { hasRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

exports.listForPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post || post.status !== 'published') throw new AppError('Post not found', 404);
  res.json(successResponse(await Comment.forPost(post.post_id)));
});

exports.create = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post || post.status !== 'published') throw new AppError('Post not found', 404);
  if (!post.allow_comments) throw new AppError('Comments are disabled for this post', 403);
  if (req.body.parent_id) {
    const parent = await Comment.findById(req.body.parent_id);
    if (!parent || parent.post_id !== post.post_id) throw new AppError('Parent comment not found on this post', 400);
  }
  const comment = await Comment.create({
    post_id: post.post_id, user_id: req.user.user_id, parent_id: req.body.parent_id,
    content: sanitizeText(req.body.content).trim(),
    // staff comments skip the moderation queue
    status: hasRole(req.user, 'editor') ? 'approved' : 'pending',
    ip_address: req.ip, user_agent: (req.headers['user-agent'] || '').slice(0, 500),
  });
  logActivity(req, 'comment.create', 'comment', comment.comment_id);
  res.status(201).json(successResponse(comment, comment.status === 'pending' ? 'Comment submitted for moderation' : 'Comment posted'));
});

exports.moderationList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query.page, req.query.limit);
  const { rows, total } = await Comment.list({ status: req.query.status, limit, offset });
  res.json({ ...successResponse(rows), pagination: getPaginationMeta(total, page, limit) });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const c = await Comment.setStatus(req.params.id, req.body.status);
  if (!c) throw new AppError('Comment not found', 404);
  logActivity(req, 'comment.moderate', 'comment', c.comment_id, c.status);
  res.json(successResponse(c, 'Comment updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) throw new AppError('Comment not found', 404);
  if (!hasRole(req.user, 'editor') && c.user_id !== req.user.user_id) throw new AppError('You can only delete your own comments', 403);
  await Comment.remove(c.comment_id);
  logActivity(req, 'comment.delete', 'comment', c.comment_id);
  res.json(successResponse(null, 'Comment deleted'));
});
