const db = require('../config/db');

async function auditLogger(req, res, next) {
  const start = Date.now();
  const uid = req.user ? req.user.uid : null;
  const path = req.originalUrl || req.url;
  const method = req.method;
  const body = req.body ? JSON.stringify(req.body) : null;

  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      await db.query(
        `INSERT INTO audit_log (user_id, action, resource, method, request_body, response_status, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [uid, path, path, method, body, res.statusCode, duration]
      );
    } catch (err) {
      console.error('Audit log write failed', err);
    }
  });

  next();
}

module.exports = { auditLogger };
