const { cache } = require('../config/redis');

const TTL = 60;

/** Cache-aside helper: returns cached value or computes + stores it. */
const remember = async (key, fn, ttl = TTL) => {
  const hit = await cache.get(key);
  if (hit !== null) return hit;
  const value = await fn();
  await cache.set(key, value, ttl);
  return value;
};

const invalidatePosts = () => Promise.all([cache.delPattern('posts:*'), cache.delPattern('analytics:*')]);
const invalidateTaxonomy = () => Promise.all([cache.delPattern('categories:*'), cache.delPattern('tags:*'), invalidatePosts()]);

module.exports = { remember, invalidatePosts, invalidateTaxonomy, cache };
