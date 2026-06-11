const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const authController = require("./controllers/authController");
const examController = require("./controllers/examController");
const adminController = require("./controllers/adminController");
const blueprintController = require("./controllers/blueprintController");
const { verifyToken, verifyAdmin, verifyFacultyOrAdmin } = require("./middleware/authMiddleware");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const questionBankController = require("./controllers/questionBankController");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

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

  const createBlueprintsTable = `
    CREATE TABLE IF NOT EXISTS blueprints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      topic VARCHAR(255),
      difficulty VARCHAR(50),
      question_type VARCHAR(50),
      learning_objective TEXT,
      template_text TEXT NOT NULL,
      options_templates TEXT[] NOT NULL,
      correct_option_template TEXT NOT NULL,
      variable_sets JSONB NOT NULL,
      tags TEXT[],
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createExamBlueprintsTable = `
    CREATE TABLE IF NOT EXISTS exam_blueprints (
      exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
      blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      PRIMARY KEY (exam_id, blueprint_id)
    );
  `;

  const createAttemptQuestionsTable = `
    CREATE TABLE IF NOT EXISTS attempt_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
      blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
      variant_seed VARCHAR(255) NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT[] NOT NULL,
      correct_option INTEGER NOT NULL,
      selected_variables JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createUploadedDocumentsTable = `
    CREATE TABLE IF NOT EXISTS uploaded_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name VARCHAR(255) NOT NULL,
      uploaded_by VARCHAR(255) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      processing_status VARCHAR(50) DEFAULT 'UPLOADED',
      report_json JSONB,
      parsed_json JSONB
    );
  `;

  const createTopicsTable = `
    CREATE TABLE IF NOT EXISTS topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
      topic_name VARCHAR(255) NOT NULL,
      description TEXT,
      confidence_score NUMERIC(4, 2) DEFAULT 1.00,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createConceptCandidatesTable = `
    CREATE TABLE IF NOT EXISTS concept_candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
      topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
      raw_concept TEXT NOT NULL,
      normalized_concept TEXT NOT NULL,
      learning_objective TEXT,
      difficulty VARCHAR(50) DEFAULT 'Medium',
      confidence_score NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
      extraction_reason TEXT,
      source_snippet TEXT,
      status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createBlueprintCandidatesTable = `
    CREATE TABLE IF NOT EXISTS blueprint_candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
      concept_candidate_id UUID REFERENCES concept_candidates(id) ON DELETE SET NULL,
      original_question TEXT NOT NULL,
      generated_json JSONB NOT NULL,
      quality_score INTEGER NOT NULL DEFAULT 100,
      confidence_score NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
      status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    console.log("Initializing database tables...");
    await db.query(createUsersTable);
    await db.query(createExamsTable);
    await db.query(createQuestionsTable);
    await db.query(createExamAttemptsTable);
    await db.query(createBlueprintsTable);
    await db.query(createExamBlueprintsTable);
    await db.query(createAttemptQuestionsTable);
    await db.query(createUploadedDocumentsTable);
    await db.query(createTopicsTable);
    await db.query(createConceptCandidatesTable);
    await db.query(createBlueprintCandidatesTable);

    // Database schema migrations
    console.log("Running database migrations...");

    // Migrate concept_candidates
    // Check and add topic_id column
    await db.query("ALTER TABLE concept_candidates ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;").catch(() => {});

    // Check and rename concept or concept_name to raw_concept if they exist
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='concept_candidates' AND column_name='concept'
        ) THEN
          ALTER TABLE concept_candidates RENAME COLUMN concept TO raw_concept;
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='concept_candidates' AND column_name='concept_name'
        ) THEN
          ALTER TABLE concept_candidates RENAME COLUMN concept_name TO raw_concept;
        END IF;
      END $$;
    `).catch(() => {});

    // Ensure raw_concept column exists
    await db.query("ALTER TABLE concept_candidates ADD COLUMN IF NOT EXISTS raw_concept TEXT;").catch(() => {});

    // Add normalized_concept column
    await db.query("ALTER TABLE concept_candidates ADD COLUMN IF NOT EXISTS normalized_concept TEXT;").catch(() => {});
    await db.query("UPDATE concept_candidates SET normalized_concept = raw_concept WHERE normalized_concept IS NULL;").catch(() => {});
    await db.query("ALTER TABLE concept_candidates ALTER COLUMN normalized_concept SET NOT NULL;").catch(() => {});

    // Add source_snippet column
    await db.query("ALTER TABLE concept_candidates ADD COLUMN IF NOT EXISTS source_snippet TEXT;").catch(() => {});

    // Drop subtopic column
    await db.query("ALTER TABLE concept_candidates DROP COLUMN IF EXISTS subtopic;").catch(() => {});

    // Drop topic column if it exists
    await db.query("ALTER TABLE concept_candidates DROP COLUMN IF EXISTS topic;").catch(() => {});

    await db.query("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS violations_count INTEGER DEFAULT 0;");
    await db.query("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'submitted';");
    await db.query("ALTER TABLE blueprint_candidates ADD COLUMN IF NOT EXISTS concept_candidate_id UUID REFERENCES concept_candidates(id) ON DELETE SET NULL;").catch(() => {});

    // Widen CGPA column: NUMERIC(3,2) only allows up to 9.99 but a 100% score yields CGPA=10.00
    await db.query("ALTER TABLE exam_attempts ALTER COLUMN cgpa TYPE NUMERIC(4, 2);").catch(() => {});

    // Add parsed_json column to uploaded_documents
    await db.query("ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS parsed_json JSONB;").catch(() => {});

    // Add confidence_score column to topics
    await db.query("ALTER TABLE topics ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4, 2) DEFAULT 1.00;").catch(() => {});

    
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
app.post("/api/exams/:examId/blueprints", verifyToken, verifyFacultyOrAdmin, examController.updateExamBlueprints);
app.post("/api/exams/:examId/status", verifyToken, examController.updateExamStatus);
app.get("/api/exams", verifyToken, examController.getExams);
app.get("/api/exams/:examId", verifyToken, examController.getExamDetails);
app.post("/api/exams/:examId/start", verifyToken, examController.startExam);
app.get("/api/exams/:examId/questions", verifyToken, examController.getExamQuestions);
app.post("/api/exams/:examId/submit", verifyToken, examController.submitExam);
app.get("/api/exams/:examId/results", verifyToken, examController.getExamResults);
app.get("/api/students/attempts", verifyToken, examController.getStudentAttempts);

// Blueprint Endpoints
app.post("/api/blueprints", verifyToken, verifyFacultyOrAdmin, blueprintController.createBlueprint);
app.get("/api/blueprints", verifyToken, verifyFacultyOrAdmin, blueprintController.listBlueprints);
app.get("/api/blueprints/:id", verifyToken, verifyFacultyOrAdmin, blueprintController.getBlueprintDetails);
app.put("/api/blueprints/:id", verifyToken, verifyFacultyOrAdmin, blueprintController.updateBlueprint);
app.delete("/api/blueprints/:id", verifyToken, verifyFacultyOrAdmin, blueprintController.deleteBlueprint);
app.post("/api/blueprints/preview", verifyToken, verifyFacultyOrAdmin, blueprintController.previewBlueprintVariant);

// Question Bank & AI Blueprint Pipeline Endpoints
app.post("/api/question-bank/upload", verifyToken, verifyFacultyOrAdmin, upload.single("file"), questionBankController.uploadDocument);
app.post("/api/question-bank/process", verifyToken, verifyFacultyOrAdmin, questionBankController.processDocument);
app.get("/api/question-bank/documents", verifyToken, verifyFacultyOrAdmin, questionBankController.listDocuments);
app.get("/api/concept-candidates", verifyToken, verifyFacultyOrAdmin, questionBankController.listConcepts);
app.put("/api/concept-candidates/:id", verifyToken, verifyFacultyOrAdmin, questionBankController.updateConcept);
app.post("/api/concept-candidates/:id/approve", verifyToken, verifyFacultyOrAdmin, questionBankController.approveConcept);
app.post("/api/concept-candidates/:id/reject", verifyToken, verifyFacultyOrAdmin, questionBankController.rejectConcept);
app.post("/api/concept-candidates/reject-all", verifyToken, verifyFacultyOrAdmin, questionBankController.rejectAllConcepts);
app.post("/api/concept-candidates/:id/generate-blueprints", verifyToken, verifyFacultyOrAdmin, questionBankController.generateBlueprints);
app.post("/api/concept-candidates/generate-blueprints-bulk", verifyToken, verifyFacultyOrAdmin, questionBankController.generateBlueprintsBulk);
app.get("/api/topics", verifyToken, verifyFacultyOrAdmin, questionBankController.listTopics);
app.delete("/api/topics/:id", verifyToken, verifyFacultyOrAdmin, questionBankController.deleteTopic);
app.get("/api/blueprint-candidates", verifyToken, verifyFacultyOrAdmin, questionBankController.listCandidates);
app.put("/api/blueprint-candidates/:id", verifyToken, verifyFacultyOrAdmin, questionBankController.updateCandidate);
app.post("/api/blueprint-candidates/:id/approve", verifyToken, verifyFacultyOrAdmin, questionBankController.approveCandidate);
app.post("/api/blueprint-candidates/:id/reject", verifyToken, verifyFacultyOrAdmin, questionBankController.rejectCandidate);
app.post("/api/blueprint-candidates/reject-all", verifyToken, verifyFacultyOrAdmin, questionBankController.rejectAllCandidates);
app.post("/api/blueprint-candidates/:id/preview", verifyToken, verifyFacultyOrAdmin, questionBankController.previewCandidateVariants);

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
