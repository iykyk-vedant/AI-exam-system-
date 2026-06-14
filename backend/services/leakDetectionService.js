const db = require('../config/db');

/**
 * LeakDetectionService: basic fingerprint matching and aggregation
 */
async function investigateLeakByHashes(hashes) {
  if (!Array.isArray(hashes) || hashes.length === 0) return [];

  const res = await db.query(
    `SELECT question_hash, student_id, attempt_id, blueprint_id, created_at
     FROM question_audit_log WHERE question_hash = ANY($1)`,
    [hashes]
  );

  // Aggregate matches by student
  const byStudent = {};
  for (const row of res.rows) {
    const sid = row.student_id || 'unknown';
    if (!byStudent[sid]) byStudent[sid] = { student_id: sid, matches: [] };
    byStudent[sid].matches.push({ question_hash: row.question_hash, attempt_id: row.attempt_id, blueprint_id: row.blueprint_id, at: row.created_at });
  }

  // Compute simple confidence: percent of leaked hashes matched for each student
  const output = Object.values(byStudent).map((entry) => {
    const uniqueMatched = new Set(entry.matches.map(m => m.question_hash)).size;
    const confidence = Math.min(100, Math.round((uniqueMatched / hashes.length) * 100));
    return { ...entry, uniqueMatches: uniqueMatched, confidence };
  });

  return output;
}

module.exports = { investigateLeakByHashes };
