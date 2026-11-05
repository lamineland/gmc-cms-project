const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'educms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info(`Database connected at ${result.rows[0].now.toISOString()}`);
    return true;
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    return false;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug(`query ${Date.now() - start}ms`, { text: text.slice(0, 80) });
    return result;
  } catch (error) {
    logger.error('Query error', { error: error.message, text: text.slice(0, 120) });
    throw error;
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { query, pool, transaction, testConnection };
