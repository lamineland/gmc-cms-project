const redis = require('redis');
require('dotenv').config();
const logger = require('../utils/logger');

let redisClient = null;

if (process.env.REDIS_ENABLED === 'true') {
  redisClient = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB, 10) || 0,
  });
  redisClient.on('ready', () => logger.info('Redis client ready'));
  redisClient.on('error', (err) => logger.warn(`Redis error: ${err.message}`));
  redisClient.connect().catch((err) => logger.warn(`Redis connect failed: ${err.message}`));
}

// All helpers degrade gracefully: if Redis is off or down the app just skips caching.
const ready = () => redisClient && redisClient.isReady;

const cache = {
  get: async (key) => {
    if (!ready()) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) { logger.warn(`Redis GET error: ${e.message}`); return null; }
  },
  set: async (key, value, ttl = 3600) => {
    if (!ready()) return false;
    try { await redisClient.setEx(key, ttl, JSON.stringify(value)); return true; }
    catch (e) { logger.warn(`Redis SET error: ${e.message}`); return false; }
  },
  del: async (key) => {
    if (!ready()) return false;
    try { await redisClient.del(key); return true; }
    catch (e) { logger.warn(`Redis DEL error: ${e.message}`); return false; }
  },
  delPattern: async (pattern) => {
    if (!ready()) return false;
    try {
      const keys = [];
      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) keys.push(key);
      if (keys.length) await redisClient.del(keys);
      return true;
    } catch (e) { logger.warn(`Redis DEL pattern error: ${e.message}`); return false; }
  },
  exists: async (key) => {
    if (!ready()) return false;
    try { return (await redisClient.exists(key)) === 1; }
    catch (e) { return false; }
  },
  flush: async () => {
    if (!ready()) return false;
    try { await redisClient.flushDb(); return true; }
    catch (e) { return false; }
  },
};

module.exports = { redisClient, cache };
