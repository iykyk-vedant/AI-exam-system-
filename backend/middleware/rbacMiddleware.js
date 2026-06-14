/**
 * RBAC middleware helpers
 */
const db = require('../config/db');

async function requireRole(role) {
  return async function (req, res, next) {
    try {
      const uid = req.user && req.user.uid;
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthenticated' });
      const r = await db.query('SELECT role FROM users WHERE firebase_uid = $1 LIMIT 1', [uid]);
      const userRole = r.rows[0] ? r.rows[0].role : 'student';
      if (userRole !== role && userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: insufficient privileges' });
      }
      next();
    } catch (err) {
      console.error('RBAC error', err);
      return res.status(500).json({ success: false, error: 'RBAC failure' });
    }
  };
}

module.exports = { requireRole };
