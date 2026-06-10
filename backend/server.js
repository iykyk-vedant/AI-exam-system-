const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const authController = require("./controllers/authController");
const examController = require("./controllers/examController");
const adminController = require("./controllers/adminController");
const { verifyToken, verifyAdmin } = require("./middleware/authMiddleware");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Tables
async function initDatabase() {

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_uid VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createExamsTable = `
    CREATE TABLE IF NOT EXISTS exams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_by VARCHAR(255),
      status VARCHAR(20) DEFAULT 'draft',
      passing_percentage NUMERIC(5, 2) DEFAULT 50.00,
      duration_minutes INTEGER DEFAULT 30,
      negative_marking NUMERIC(3, 2) DEFAULT 0.00,
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createQuestionsTable = `
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options TEXT[] NOT NULL,
      correct_option INTEGER NOT NULL
    );
  `;

  const createExamAttemptsTable = `
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
      student_uid VARCHAR(255),
      score NUMERIC(5, 2) NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage NUMERIC(5, 2) NOT NULL,
      passed BOOLEAN NOT NULL,
      attempt_number INTEGER DEFAULT 1,
      cgpa NUMERIC(3, 2),
      submitted_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    console.log("Initializing database tables...");
    await db.query(createUsersTable);
    await db.query(createExamsTable);
    await db.query(createQuestionsTable);
    await db.query(createExamAttemptsTable);

    // Database schema migrations
    console.log("Running database migrations...");
    await db.query("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS violations_count INTEGER DEFAULT 0;");

    // Widen CGPA column: NUMERIC(3,2) only allows up to 9.99 but a 100% score yields CGPA=10.00
    await db.query("ALTER TABLE exam_attempts ALTER COLUMN cgpa TYPE NUMERIC(4, 2);").catch(() => {});

    
    const createSystemSettingsTable = `
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;
    await db.query(createSystemSettingsTable);
    await db.query(`
      INSERT INTO system_settings (key, value)
      VALUES ('institution_name', 'XYZ University')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log("Database tables and migrations initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
  }
}

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});



// Authentication Endpoints
app.post("/api/auth/register", verifyToken, authController.registerUser);
app.post("/api/auth/login", verifyToken, authController.loginUser);
app.get("/api/auth/me", verifyToken, authController.getCurrentUser);

// Exam Endpoints
app.post("/api/exams", verifyToken, examController.createExam);
app.post("/api/exams/:examId/questions", verifyToken, examController.addQuestions);
app.post("/api/exams/:examId/status", verifyToken, examController.updateExamStatus);
app.get("/api/exams", verifyToken, examController.getExams);
app.get("/api/exams/:examId", verifyToken, examController.getExamDetails);
app.post("/api/exams/:examId/submit", verifyToken, examController.submitExam);
app.get("/api/exams/:examId/results", verifyToken, examController.getExamResults);
app.get("/api/students/attempts", verifyToken, examController.getStudentAttempts);

// Admin Endpoints
app.get("/api/admin/stats", verifyToken, verifyAdmin, adminController.getAdminStats);

app.get("/api/admin/settings", verifyToken, verifyAdmin, adminController.getSystemSettings);
app.post("/api/admin/settings", verifyToken, verifyAdmin, adminController.updateSystemSetting);
app.get("/api/admin/export/:type", verifyToken, verifyAdmin, adminController.exportAuditCSV);

// Start Server after DB init
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
  });
}

startServer();
