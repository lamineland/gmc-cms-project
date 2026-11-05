require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { uploadDir } = require('./middleware/upload');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const db = require('./config/database');

const app = express();
const api = `/api/${process.env.API_VERSION || 'v1'}`;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow the SPA on another origin to show uploads
app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:3001').split(','),
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny', { stream: { write: (m) => logger.http(m.trim()) } }));

app.use(rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 300,
  standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many requests, please slow down' },
}));

app.use('/uploads', express.static(uploadDir, { maxAge: '7d', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

app.get('/health', async (req, res) => {
  const ok = await db.pool.query('SELECT 1').then(() => true).catch(() => false);
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', database: ok, uptime: process.uptime() });
});

app.use(`${api}/auth`, require('./routes/auth'));
app.use(`${api}/users`, require('./routes/users'));
app.use(`${api}/posts`, require('./routes/posts'));
app.use(`${api}/categories`, require('./routes/categories'));
app.use(`${api}/tags`, require('./routes/tags'));
app.use(`${api}/comments`, require('./routes/comments'));
app.use(`${api}/media`, require('./routes/media'));
app.use(`${api}/analytics`, require('./routes/analytics'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
