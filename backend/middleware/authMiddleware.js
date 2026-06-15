const admin = require("../config/firebaseAdmin");
const { getAuth } = require("firebase-admin/auth");
const db = require("../config/db");

/**
 * Middleware to verify Firebase ID Token from request headers.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("AUTH HEADER RECEIVED:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("Access Denied: Missing or malformed Authorization header.");
    return res.status(401).json({
      success: false,
      error: "Access Denied: Authorization Bearer token is required."
    });
  }

  const token = authHeader.split(" ")[1];


  try {
    // Decode and verify the Firebase ID Token
    const decodedToken = await getAuth().verifyIdToken(token);
    console.log("Token successfully verified for UID:", decodedToken.uid);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    return next();
  } catch (error) {
    console.error("Firebase token verification failed. Error details:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token.",
      details: error.message
    });
  }
}

/**
 * Middleware to verify user role is admin.
 */
async function verifyAdmin(req, res, next) {
  const userUid = req.user?.uid;
  if (!userUid) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing user authentication context."
    });
  }

  try {
    const userRes = await db.query("SELECT role FROM users WHERE firebase_uid = $1 LIMIT 1", [userUid]);
    if (userRes.rows.length === 0 || userRes.rows[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Superuser role required."
      });
    }
    return next();
  } catch (error) {
    console.error("verifyAdmin failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify admin status.",
      details: error.message
    });
  }
}

/**
 * Middleware to verify user role is faculty or admin.
 */
async function verifyFacultyOrAdmin(req, res, next) {
  const userUid = req.user?.uid;
  if (!userUid) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing user authentication context."
    });
  }

  try {
    const userRes = await db.query("SELECT role FROM users WHERE firebase_uid = $1 LIMIT 1", [userUid]);
    if (userRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: User account not registered."
      });
    }

    const role = userRes.rows[0].role;
    if (role !== "faculty" && role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Faculty or Admin role required."
      });
    }

    req.user.role = role;
    return next();
  } catch (error) {
    console.error("verifyFacultyOrAdmin failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify access permissions.",
      details: error.message
    });
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyFacultyOrAdmin
};
