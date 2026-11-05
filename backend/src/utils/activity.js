const { query } = require('../config/database');
const logger = require('./logger');

/** Fire-and-forget audit trail; never breaks the request. */
const logActivity = (req, action, entityType = null, entityId = null, description = null) => {
  query(
    'INSERT INTO activity_log (user_id, action, entity_type, entity_id, description, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [req.user ? req.user.user_id : null, action, entityType, entityId, description, req.ip, (req.headers['user-agent'] || '').slice(0, 500)]
  ).catch((e) => logger.warn(`activity log failed: ${e.message}`));
};
module.exports = { logActivity };
