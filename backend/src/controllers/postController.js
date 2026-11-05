const Post = require('../models/Post');
const Tag = require('../models/Tag');
const { transaction } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { successResponse, paginate, getPaginationMeta, generateUniqueSlug, generateSlug, calculateReadingTime, extractExcerpt } = require('../utils/helpers');
const { sanitizeContent, sanitizeText } = require('../utils/sanitize');
const { remember, invalidatePosts } = require('../services/cacheService');
const { hasRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const isStaff = (u) => hasRole(u, 'editor');
const canEdit = (user, post) => isStaff(user) || (user.role === 'author' && post.author_id === user.user_id);
const isVisible = (user, post) => post.status === 'published' && new Date(post.published_at) <= new Date() || (user && canEdit(user, post));

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query.page, req.query.limit);
  const { status, category, tag, search, sort, featured, mine, author } = req.query;
  const user = req.user;
  const filters = { limit, offset, sort, search: search && search.trim(), categorySlug: category, tagSlug: tag, featured: featured === 'true' };

  // `scope=manage` is the admin-panel view: staff see every post, authors only their own. Everything else is the public view.
  const manage = req.query.scope === 'manage' && user && (isStaff(user) || user.role === 'author');
  if (manage) {
    filters.status = status || 'all';
    if (!isStaff(user) || mine === 'true') filters.authorId = user.user_id;
    else if (author) filters.authorId = parseInt(author, 10) || undefined;
  } else {
    filters.publishedOnly = true;
    if (author) filters.authorId = parseInt(author, 10) || undefined;
  }

  const compute = async () => {
    const { rows, total } = await Post.list(filters);
    return { rows, total };
  };
  const { rows, total } = filters.publishedOnly
    ? await remember(`posts:list:${JSON.stringify(filters)}`, compute)
    : await compute();
  res.json({ ...successResponse(rows), pagination: getPaginationMeta(total, page, limit) });
});

exports.get = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const post = /^\d+$/.test(idOrSlug) ? await Post.findById(+idOrSlug) : await Post.findBySlug(idOrSlug);
  if (!post || !isVisible(req.user, post)) throw new AppError('Post not found', 404);
  if (post.status === 'published') Post.incrementViews(post.post_id).catch(() => {});
  const related = req.query.related === 'true' ? await Post.related(post.post_id) : undefined;
  res.json(successResponse({ ...post, related }));
});

const normalise = (body, user, existing) => {
  const out = {};
  if (body.title !== undefined) out.title = sanitizeText(body.title).replace(/\s+/g, ' ').trim();
  if (body.content !== undefined) out.content = sanitizeContent(body.content);
  for (const k of ['excerpt', 'featured_image', 'meta_title', 'meta_description', 'meta_keywords']) {
    if (body[k] !== undefined) out[k] = body[k] === null ? null : sanitizeText(String(body[k])).trim() || null;
  }
  for (const k of ['category_id', 'is_featured', 'allow_comments']) if (body[k] !== undefined) out[k] = body[k];
  if (body.status !== undefined) out.status = body.status;
  // Authors work in drafts; publishing/archiving/featuring is an editorial decision.
  if (!isStaff(user)) {
    out.status = existing ? existing.status : 'draft';
    delete out.is_featured;
  }
  return out;
};

exports.create = asyncHandler(async (req, res) => {
  const data = normalise(req.body, req.user, null);
  const slug = await generateUniqueSlug(data.title, (s) => Post.slugExists(s));
  const status = data.status || 'draft';
  const post = {
    title: data.title, slug, content: data.content,
    excerpt: data.excerpt || extractExcerpt(data.content, 200),
    author_id: req.user.user_id, category_id: data.category_id || null, status,
    featured_image: data.featured_image || null,
    published_at: status === 'published' ? new Date() : null,
    meta_title: data.meta_title || data.title.slice(0, 255), meta_description: data.meta_description || extractExcerpt(data.content, 160),
    meta_keywords: data.meta_keywords || null,
    is_featured: !!data.is_featured, allow_comments: data.allow_comments !== false,
    reading_time: calculateReadingTime(data.content),
  };
  const id = await transaction(async (client) => {
    const postId = await Post.insert(client, post);
    await Post.setTags(client, postId, await Tag.resolveIds(client, req.body.tags, generateSlug));
    await Post.addVersion(client, { ...post, post_id: postId }, req.user.user_id, 'Initial version');
    return postId;
  });
  await invalidatePosts();
  logActivity(req, 'post.create', 'post', id, post.title);
  res.status(201).json(successResponse(await Post.findById(id), 'Post created'));
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await Post.findById(req.params.id);
  if (!existing || !canEdit(req.user, existing)) throw new AppError(existing ? 'You can only edit your own posts' : 'Post not found', existing ? 403 : 404);
  const data = normalise(req.body, req.user, existing);
  const merged = { ...existing, ...data };
  if (data.title && data.title !== existing.title) {
    const wanted = generateSlug(data.title);
    merged.slug = !(await Post.slugExists(wanted, existing.post_id)) ? wanted : await generateUniqueSlug(data.title, (s) => Post.slugExists(s, existing.post_id));
    if (existing.status === 'published') merged.slug = existing.slug; // keep published URLs stable
  }
  if (merged.status === 'published' && !existing.published_at) merged.published_at = new Date();
  if (merged.status !== 'published' && existing.status === 'published') merged.published_at = existing.published_at; // keep original date
  if (data.content !== undefined) merged.reading_time = calculateReadingTime(merged.content);

  await transaction(async (client) => {
    await Post.update(client, existing.post_id, merged);
    if (Array.isArray(req.body.tags)) await Post.setTags(client, existing.post_id, await Tag.resolveIds(client, req.body.tags, generateSlug));
    await Post.addVersion(client, merged, req.user.user_id, req.body.change_note);
  });
  await invalidatePosts();
  logActivity(req, 'post.update', 'post', existing.post_id, merged.title);
  res.json(successResponse(await Post.findById(existing.post_id), 'Post updated'));
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await Post.findById(req.params.id);
  if (!existing || !canEdit(req.user, existing)) throw new AppError(existing ? 'You can only delete your own posts' : 'Post not found', existing ? 403 : 404);
  await Post.remove(existing.post_id);
  await invalidatePosts();
  logActivity(req, 'post.delete', 'post', existing.post_id, existing.title);
  res.json(successResponse(null, 'Post deleted'));
});

exports.like = asyncHandler(async (req, res) => {
  const row = await Post.incrementLikes(req.params.id);
  if (!row) throw new AppError('Post not found', 404);
  res.json(successResponse({ like_count: row.like_count }));
});

exports.versions = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || !canEdit(req.user, post)) throw new AppError('Post not found', 404);
  res.json(successResponse(await Post.versions(post.post_id)));
});

exports.version = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || !canEdit(req.user, post)) throw new AppError('Post not found', 404);
  const v = await Post.version(post.post_id, req.params.versionId);
  if (!v) throw new AppError('Version not found', 404);
  res.json(successResponse(v));
});

exports.restoreVersion = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || !canEdit(req.user, post)) throw new AppError('Post not found', 404);
  const v = await Post.version(post.post_id, req.params.versionId);
  if (!v) throw new AppError('Version not found', 404);
  const merged = { ...post, title: v.title, content: v.content, excerpt: v.excerpt, reading_time: calculateReadingTime(v.content) };
  await transaction(async (client) => {
    await Post.update(client, post.post_id, merged);
    await Post.addVersion(client, merged, req.user.user_id, `Restored from version ${v.version_number}`);
  });
  await invalidatePosts();
  logActivity(req, 'post.restore', 'post', post.post_id, `version ${v.version_number}`);
  res.json(successResponse(await Post.findById(post.post_id), 'Version restored'));
});
