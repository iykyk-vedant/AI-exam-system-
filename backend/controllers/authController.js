const db = require("../config/db");

/**
 * Registers a new user profile in PostgreSQL database.
 * The firebaseUid and email are read from the verified token in req.user.
 * Route: POST /api/auth/register
 */
async function registerUser(req, res) {
  const { name, role } = req.body;
  const { uid: firebaseUid, email } = req.user;

  if (!name || !role) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: name and role are required."
    });
  }

  // Restrict Admin self-selection (Safety check)
  const normalizedRole = role.toLowerCase().trim();
  if (normalizedRole === "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Admin accounts cannot be self-selected or created via public registration."
    });
  }

  // Restrict to allowed signup roles
  if (!["student", "faculty"].includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      error: "Invalid role selected. Allowed roles are: student, faculty."
    });
  }

  try {
    const queryText = `
      INSERT INTO users (firebase_uid, email, role, name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role
      RETURNING firebase_uid, email, role, name, created_at;
    `;
    const values = [firebaseUid, email, normalizedRole, name];
    const dbResult = await db.query(queryText, values);
    
    return res.status(201).json({
      success: true,
      message: "User profile successfully registered in database.",
      data: dbResult.rows[0]
    });
  } catch (error) {
    console.error("Failed to register user in database:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to persist user profile in database.",
      details: error.message
    });
  }
}

/**
 * Resolves user profile details and role on login.
 * Route: POST /api/auth/login
 */
async function loginUser(req, res) {
  const { uid: firebaseUid } = req.user;

  try {
    const dbResult = await db.query(
      "SELECT firebase_uid, email, role, name FROM users WHERE firebase_uid = $1 LIMIT 1",
      [firebaseUid]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User profile not found in database. Please signup first to configure your role."
      });
    }

    return res.status(200).json({
      success: true,
      data: dbResult.rows[0]
    });
  } catch (error) {
    console.error("Login verification failed:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to process login verification.",
      details: error.message
    });
  }
}

/**
 * Restores user profile and role details on page refresh (session hydration).
 * Route: GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  const { uid: firebaseUid } = req.user;

  try {
    const dbResult = await db.query(
      "SELECT firebase_uid, email, role, name FROM users WHERE firebase_uid = $1 LIMIT 1",
      [firebaseUid]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    const user = dbResult.rows[0];
    
    // Return structured payload as requested
    return res.status(200).json({
      firebaseUid: user.firebase_uid,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    console.error("GetCurrentUser failed:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to hydrate session.",
      details: error.message
    });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
