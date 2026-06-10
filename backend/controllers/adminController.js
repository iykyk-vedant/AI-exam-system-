const db = require("../config/db");

/**
 * Compiles database metrics and recent proctoring focus violations for the Admin Dashboard.
 * Route: GET /api/admin/stats
 */
async function getAdminStats(req, res) {
  try {
    // 1. Fetch counts
    const examsCountRes = await db.query("SELECT COUNT(*)::integer FROM exams");
    const studentsCountRes = await db.query("SELECT COUNT(DISTINCT firebase_uid)::integer FROM users WHERE role = 'student'");
    const attemptsCountRes = await db.query("SELECT COUNT(*)::integer FROM exam_attempts");
    
    // 2. Fetch pass vs fail counts
    const passFailRes = await db.query(`
      SELECT 
        COUNT(CASE WHEN passed = true THEN 1 END)::integer as passed_count,
        COUNT(CASE WHEN passed = false THEN 1 END)::integer as failed_count
      FROM exam_attempts
    `);



    // 5. Fetch total proctoring violations
    const violationsSumRes = await db.query("SELECT COALESCE(SUM(violations_count), 0)::integer FROM exam_attempts");

    // 6. Fetch recent attempts with proctoring violations
    const recentViolationsRes = await db.query(`
      SELECT 
        ea.id,
        ea.violations_count,
        ea.submitted_at,
        ea.percentage,
        ea.passed,
        u.name as student_name,
        u.email as student_email,
        e.title as exam_title
      FROM exam_attempts ea
      JOIN users u ON ea.student_uid = u.firebase_uid
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.violations_count > 0
      ORDER BY ea.submitted_at DESC
      LIMIT 30;
    `);

    // Calculate pass/fail percentages
    const totalAttempts = attemptsCountRes.rows[0].count || 0;
    const passedCount = passFailRes.rows[0].passed_count || 0;
    const failedCount = passFailRes.rows[0].failed_count || 0;
    const passPercentage = totalAttempts > 0 ? Number(((passedCount / totalAttempts) * 100).toFixed(2)) : 0;
    const failPercentage = totalAttempts > 0 ? Number(((failedCount / totalAttempts) * 100).toFixed(2)) : 0;

    const stats = {
      totalExams: examsCountRes.rows[0].count || 0,
      totalStudents: studentsCountRes.rows[0].count || 0,
      totalAttempts,
      passedCount,
      failedCount,
      passPercentage,
      failPercentage,
      totalViolations: violationsSumRes.rows[0].coalesce || 0,
      recentViolations: recentViolationsRes.rows
    };

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Failed to compile admin stats:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to compile administration statistics.",
      details: error.message
    });
  }
}


/**
 * Fetches institutional system settings.
 * Route: GET /api/admin/settings
 */
async function getSystemSettings(req, res) {
  try {
    const result = await db.query("SELECT key, value FROM system_settings");
    
    // Format settings into a key-value dictionary
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Failed to retrieve system settings:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve configuration parameters.",
      details: error.message
    });
  }
}

/**
 * Updates a specific system setting parameter.
 * Route: POST /api/admin/settings
 */
async function updateSystemSetting(req, res) {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameter: key and value are required."
    });
  }

  try {
    await db.query(
      `INSERT INTO system_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );

    return res.status(200).json({
      success: true,
      message: `System setting '${key}' successfully updated.`
    });
  } catch (error) {
    console.error(`Failed to update system setting '${key}':`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to update configuration parameter.",
      details: error.message
    });
  }
}

/**
 * Exports attempts, violations, or verification logs to a CSV download.
 * Route: GET /api/admin/export/:type
 */
async function exportAuditCSV(req, res) {
  const { type } = req.params;

  if (!["attempts", "violations"].includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid export type. Must be attempts or violations."
    });
  }

  try {
    let queryText = "";
    let dataRows = [];

    if (type === "attempts") {
      queryText = `
        SELECT 
          ea.id as attempt_id, 
          e.title as exam_title,
          u.name as student_name, 
          u.email as student_email,
          ea.score as raw_score,
          ea.total_questions,
          ea.percentage as grade_percentage,
          ea.passed as status_passed,
          ea.attempt_number,
          ea.cgpa,
          ea.violations_count,
          ea.submitted_at
        FROM exam_attempts ea 
        JOIN users u ON ea.student_uid = u.firebase_uid 
        JOIN exams e ON ea.exam_id = e.id
        ORDER BY ea.submitted_at DESC;
      `;
      const result = await db.query(queryText);
      dataRows = result.rows;
    } else if (type === "violations") {
      queryText = `
        SELECT 
          ea.id as attempt_id, 
          e.title as exam_title,
          u.name as student_name, 
          u.email as student_email,
          ea.violations_count as focus_violations,
          ea.percentage as grade_percentage,
          ea.passed,
          ea.submitted_at
        FROM exam_attempts ea 
        JOIN users u ON ea.student_uid = u.firebase_uid 
        JOIN exams e ON ea.exam_id = e.id
        WHERE ea.violations_count > 0
        ORDER BY ea.submitted_at DESC;
      `;
      const result = await db.query(queryText);
      dataRows = result.rows;
    }

    // Convert rows to CSV string
    const csvContent = convertToCSV(dataRows);

    // Stream the CSV file to the client
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_audit.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(`Failed to export CSV for type '${type}':`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to compile and export CSV dataset.",
      details: error.message
    });
  }
}

/**
 * Utility: Converts JSON array to CSV format complying with RFC 4180
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return "No records found";
  }
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Headers row
  csvRows.push(headers.map(h => `"${h}"`).join(","));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val === null || val === undefined ? '' : val)).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

module.exports = {
  getAdminStats,
  getSystemSettings,
  updateSystemSetting,
  exportAuditCSV
};
