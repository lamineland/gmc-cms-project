require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { testConnection, pool } = require('./src/config/database');
const { redisClient } = require('./src/config/redis');

const PORT = process.env.PORT || 5055;

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

(async () => {
  if (!(await testConnection())) {
    logger.error('Cannot start without a database. Is Postgres running? (docker compose up -d postgres)');
    process.exit(1);
  }
  const server = app.listen(PORT, () => logger.info(`EduCMS API listening on http://localhost:${PORT}`));

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await pool.end().catch(() => {});
      if (redisClient && redisClient.isOpen) await redisClient.quit().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
