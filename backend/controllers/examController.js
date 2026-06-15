const db = require("../config/db");
const crypto = require("crypto");
const { generateAndStoreVariant } = require("../services/variantService");
const format = require("pg-format");
require("dotenv").config();

/**
 * Computes the effective status of an exam based on status and timestamps.
 */
function getEffectiveStatus(exam) {
  const now = new Date();
  if (exam.status === "published") {
    if (exam.start_time && now < new Date(exam.start_time)) {
      return "scheduled";
    }
    if (exam.end_time && now > new Date(exam.end_time)) {
      return "closed";
    }
    return "published";
  }
  return exam.status;
}

/**
 * Creates a new exam in 'draft' status.
 * Route: POST /api/exams
 */
async function createExam(req, res) {
  const { title, description, passingPercentage, durationMinutes, negativeMarking, startTime, endTime } = req.body;
  const facultyUid = req.user.uid;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: title is required."
    });
  }

  try {
    const queryText = `
      INSERT INTO exams (
        title, 
        description, 
        created_by, 
        passing_percentage, 
        duration_minutes, 
        negative_marking, 
        start_time, 
        end_time,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
      RETURNING *;
    `;
    const values = [
      title,
      description || "",
      facultyUid,
      passingPercentage !== undefined ? Number(passingPercentage) : 50.00,
      durationMinutes !== undefined ? parseInt(durationMinutes) : 30,
      negativeMarking !== undefined ? Number(negativeMarking) : 0.00,
      startTime || null,
      endTime || null
    ];

    const dbResult = await db.query(queryText, values);
    return res.status(201).json({
      success: true,
      message: "Exam successfully created as draft.",
      data: dbResult.rows[0]
    });
  } catch (error) {
    console.error("Failed to create exam:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create exam.",
      details: error.message
    });
  }
}

/**
 * Adds questions to an exam (Only allowed in 'draft' status).
 * Route: POST /api/exams/:examId/questions
 */
async function addQuestions(req, res) {
  const { examId } = req.params;
  const { questions } = req.body; // Array of { questionText, options, correctOption }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: questions must be a non-empty array."
    });
  }

  try {
    // 1. Verify exam exists and is in 'draft' state
    const examCheck = await db.query("SELECT status FROM exams WHERE id = $1 LIMIT 1", [examId]);
    if (examCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Exam not found."
      });
    }

    if (examCheck.rows[0].status !== "draft") {
      return res.status(400).json({
        success: false,
        error: "Cannot add questions to an exam that is no longer in draft state."
      });
    }

    // 2. Insert questions
    const insertValues = [];
    for (const q of questions) {
      if (!q.questionText || !q.options || !Array.isArray(q.options) || q.correctOption === undefined) {
        return res.status(400).json({
          success: false,
          error: "Invalid question format: questionText, options (array), and correctOption are required."
        });
      }
      insertValues.push([examId, q.questionText, '{' + q.options.map(opt => `"${opt.replace(/"/g, '\\"')}"`).join(',') + '}', parseInt(q.correctOption)]);
    }

    const query = format(
      "INSERT INTO questions (exam_id, question_text, options, correct_option) VALUES %L",
      insertValues
    );
    await db.query(query);

    return res.status(200).json({
      success: true,
      message: `Successfully added ${questions.length} questions to the exam.`
    });
  } catch (error) {
    console.error("Failed to add questions:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to add questions to exam.",
      details: error.message
    });
  }
}

/**
 * Updates the status of an exam.
 * Route: POST /api/exams/:examId/status
 */
async function updateExamStatus(req, res) {
  const { examId } = req.params;
  const { status } = req.body; // 'draft', 'published', 'closed', 'archived'

  if (!status || !["draft", "published", "closed", "archived"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Invalid status value. Allowed values: draft, published, closed, archived."
    });
  }

  try {
    const dbResult = await db.query(
      "UPDATE exams SET status = $1 WHERE id = $2 RETURNING *",
      [status, examId]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Exam not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: `Exam status successfully updated to '${status}'.`,
      data: dbResult.rows[0]
    });
  } catch (error) {
    console.error("Failed to update exam status:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update exam status.",
      details: error.message
    });
  }
}

/**
 * Lists exams.
 * Students only see published or closed exams. Faculty see all exams.
 * Route: GET /api/exams
 */
async function getExams(req, res) {
  const userUid = req.user.uid;

  try {
    // 1. Fetch user role
    const userRes = await db.query("SELECT role FROM users WHERE firebase_uid = $1 LIMIT 1", [userUid]);
    const role = userRes.rows.length > 0 ? userRes.rows[0].role : "student";

    let queryText = "";
    let values = [];

    if (role === "faculty" || role === "admin") {
      queryText = `
        SELECT id, title, description, status, passing_percentage, duration_minutes, negative_marking, start_time, end_time, created_at,
          (SELECT COUNT(*)::integer FROM exam_blueprints WHERE exam_id = exams.id) as questions_count
        FROM exams
        ORDER BY created_at DESC;
      `;
    } else {
      queryText = `
        SELECT id, title, description, status, passing_percentage, duration_minutes, negative_marking, start_time, end_time, created_at,
          (SELECT COUNT(*)::integer FROM exam_blueprints WHERE exam_id = exams.id) as questions_count
        FROM exams
        WHERE status IN ('published', 'closed')
        ORDER BY created_at DESC;
      `;
    }

    const dbResult = await db.query(queryText, values);
    
    // Compute effective status dynamically
    const exams = dbResult.rows.map((exam) => {
      return {
        ...exam,
        effectiveStatus: getEffectiveStatus(exam)
      };
    });

    return res.status(200).json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error("Failed to fetch exams:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve exams.",
      details: error.message
    });
  }
}

/**
 * Fetches details of a specific exam.
 * For faculty: returns exam details and the linked blueprints.
 * For students: returns exam details with empty questions array (they must call start endpoint to get questions).
 * Route: GET /api/exams/:examId
 */
async function getExamDetails(req, res) {
  const { examId } = req.params;
  const userUid = req.user.uid;

  try {
    // 1. Fetch user role
    const userRes = await db.query("SELECT role FROM users WHERE firebase_uid = $1 LIMIT 1", [userUid]);
    const role = userRes.rows.length > 0 ? userRes.rows[0].role : "student";

    // 2. Fetch exam info
    const examRes = await db.query("SELECT * FROM exams WHERE id = $1 LIMIT 1", [examId]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Exam not found."
      });
    }

    const exam = examRes.rows[0];
    const effectiveStatus = getEffectiveStatus(exam);

    if (role !== "faculty" && role !== "admin" && effectiveStatus !== "published") {
      return res.status(403).json({
        success: false,
        error: "Access Denied: This exam is not active."
      });
    }

    // 3. Fetch blueprints if faculty/admin
    if (role === "faculty" || role === "admin") {
      const blueprintsRes = await db.query(
        `SELECT b.*, eb.position FROM blueprints b
         JOIN exam_blueprints eb ON b.id = eb.blueprint_id
         WHERE eb.exam_id = $1
         ORDER BY eb.position ASC`,
        [examId]
      );
      return res.status(200).json({
        success: true,
        data: {
          exam: {
            ...exam,
            effectiveStatus
          },
          blueprints: blueprintsRes.rows,
          questions: [] // Return empty questions array for compatibility if needed
        }
      });
    }

    // For student: Return exam info without questions or blueprints
    return res.status(200).json({
      success: true,
      data: {
        exam: {
          ...exam,
          effectiveStatus
        },
        questions: []
      }
    });
  } catch (error) {
    console.error("Failed to fetch exam details:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve exam details.",
      details: error.message
    });
  }
}

/**
 * Submits answers for grading.
 * Route: POST /api/exams/:examId/submit
 */
async function submitExam(req, res) {
  const { examId } = req.params;
  const { answers, violationsCount } = req.body; // Object in format: { [questionId]: selectedOptionIndex }
  const studentUid = req.user.uid;

  if (!answers || typeof answers !== "object") {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: answers object is required."
    });
  }

  try {
    // 1. Fetch exam information
    const examRes = await db.query("SELECT * FROM exams WHERE id = $1 LIMIT 1", [examId]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Exam not found."
      });
    }

    const exam = examRes.rows[0];
    const effectiveStatus = getEffectiveStatus(exam);

    if (effectiveStatus !== "published") {
      return res.status(403).json({
        success: false,
        error: "Submission Forbidden: This exam is currently closed, scheduled, or archived."
      });
    }

    // 2. Fetch the active ongoing attempt
    const activeAttemptRes = await db.query(
      "SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_uid = $2 AND status = 'ongoing' LIMIT 1",
      [examId, studentUid]
    );

    if (activeAttemptRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot submit exam: No ongoing exam session was found."
      });
    }

    const attempt = activeAttemptRes.rows[0];

    // 3. Fetch attempt questions (including correct_option)
    const questionsRes = await db.query(
      "SELECT id, correct_option FROM attempt_questions WHERE attempt_id = $1 ORDER BY created_at ASC",
      [attempt.id]
    );

    const questions = questionsRes.rows;
    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot submit exam: Ongoing attempt has no generated questions."
      });
    }

    // 4. Grade the exam
    let correctCount = 0;
    let incorrectCount = 0;

    for (const q of questions) {
      const studentAns = answers[q.id];
      if (studentAns !== undefined && studentAns !== null) {
        if (parseInt(studentAns) === q.correct_option) {
          correctCount += 1;
        } else {
          incorrectCount += 1;
        }
      }
    }

    // Calculate penalty
    const penalty = Number(exam.negative_marking) || 0.00;
    let rawScore = correctCount - (incorrectCount * penalty);
    if (rawScore < 0) rawScore = 0;

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Number(((rawScore / totalQuestions) * 100).toFixed(2)) : 0;
    const passed = percentage >= Number(exam.passing_percentage);
    const finalCgpa = passed ? Math.min(10.00, Number((5.0 + (percentage / 20.0)).toFixed(2))) : null;

    // 5. Update the attempt record to 'submitted'
    const updateAttemptQuery = `
      UPDATE exam_attempts
      SET score = $1,
          total_questions = $2,
          percentage = $3,
          passed = $4,
          status = 'submitted',
          cgpa = $5,
          violations_count = $6,
          submitted_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;
    const attemptValues = [
      rawScore,
      totalQuestions,
      percentage,
      passed,
      finalCgpa,
      violationsCount !== undefined ? parseInt(violationsCount) : 0,
      attempt.id
    ];

    await db.query(updateAttemptQuery, attemptValues);

    return res.status(200).json({
      success: true,
      data: {
        score: rawScore,
        totalQuestions,
        percentage,
        passed,
        attemptNumber: attempt.attempt_number,
        violationsCount: violationsCount !== undefined ? parseInt(violationsCount) : 0
      }
    });
  } catch (error) {
    console.error("Failed to process exam submission:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to grade and process exam submission.",
      details: error.message
    });
  }
}

/**
 * Returns results of all students who took a given exam (Faculty view).
 * Route: GET /api/exams/:examId/results
 */
async function getExamResults(req, res) {
  const { examId } = req.params;

  try {
    const queryText = `
      SELECT 
        ea.id, 
        ea.score, 
        ea.total_questions, 
        ea.percentage, 
        ea.passed, 
        ea.attempt_number, 
        ea.cgpa, 
        ea.violations_count,
        ea.submitted_at,
        u.name as student_name, 
        u.email as student_email
      FROM exam_attempts ea
      LEFT JOIN users u ON ea.student_uid = u.firebase_uid
      WHERE ea.exam_id = $1 AND ea.status = 'submitted'
      ORDER BY ea.submitted_at DESC;
    `;
    const dbResult = await db.query(queryText, [examId]);
    return res.status(200).json({
      success: true,
      data: dbResult.rows
    });
  } catch (error) {
    console.error("Failed to fetch exam results:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch exam results.",
      details: error.message
    });
  }
}

/**
 * Returns attempts made by the currently logged-in student.
 * Route: GET /api/students/attempts
 */
async function getStudentAttempts(req, res) {
  const studentUid = req.user.uid;

  try {
    const queryText = `
      SELECT 
        ea.id, 
        ea.exam_id, 
        ea.score, 
        ea.total_questions, 
        ea.percentage, 
        ea.passed, 
        ea.attempt_number, 
        ea.cgpa, 
        ea.violations_count,
        ea.submitted_at,
        e.title as exam_title
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.student_uid = $1 AND ea.status = 'submitted'
      ORDER BY ea.submitted_at DESC;
    `;
    const dbResult = await db.query(queryText, [studentUid]);
    return res.status(200).json({
      success: true,
      data: dbResult.rows
    });
  } catch (error) {
    console.error("Failed to fetch student attempts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve attempt history.",
      details: error.message
    });
  }
}

async function startExam(req, res) {
  const { examId } = req.params;
  const studentUid = req.user.uid;

  try {
    // 1. Fetch exam information
    const examRes = await db.query("SELECT * FROM exams WHERE id = $1 LIMIT 1", [examId]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Exam not found." });
    }

    const exam = examRes.rows[0];
    const effectiveStatus = getEffectiveStatus(exam);

    if (effectiveStatus !== "published") {
      return res.status(403).json({
        success: false,
        error: "Access Forbidden: This exam is currently closed, scheduled, or archived."
      });
    }

    // 2. Check for active ongoing attempt
    const activeAttemptRes = await db.query(
      "SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_uid = $2 AND status = 'ongoing' LIMIT 1",
      [examId, studentUid]
    );

    if (activeAttemptRes.rows.length > 0) {
      const attempt = activeAttemptRes.rows[0];
      const questionsRes = await db.query(
        "SELECT id, blueprint_id, question_text, options FROM attempt_questions WHERE attempt_id = $1 ORDER BY created_at ASC",
        [attempt.id]
      );

      // Calculate time remaining
      const startedAt = new Date(attempt.created_at).getTime();
      const now = new Date().getTime();
      const secondsElapsed = Math.floor((now - startedAt) / 1000);
      const totalSeconds = exam.duration_minutes * 60;
      const remainingSeconds = Math.max(0, totalSeconds - secondsElapsed);

      return res.status(200).json({
        success: true,
        attemptId: attempt.id,
        questions: questionsRes.rows,
        timeLeft: remainingSeconds
      });
    }

    // 3. Start a new attempt
    await db.query('BEGIN');

    // Count previous submitted attempts
    const countRes = await db.query(
      "SELECT COUNT(*)::integer FROM exam_attempts WHERE exam_id = $1 AND student_uid = $2 AND status = 'submitted'",
      [examId, studentUid]
    );
    const attemptNumber = countRes.rows[0].count + 1;

    // Create ongoing attempt
    const insertAttemptRes = await db.query(
      `INSERT INTO exam_attempts (
        exam_id, student_uid, score, total_questions, percentage, passed, attempt_number, status, cgpa, violations_count, created_at, submitted_at
      ) VALUES ($1, $2, 0, 0, 0, false, $3, 'ongoing', null, 0, NOW(), null) RETURNING *`,
      [examId, studentUid, attemptNumber]
    );
    const newAttempt = insertAttemptRes.rows[0];

    // Get exam blueprints
    const blueprintsRes = await db.query(
      `SELECT b.* FROM blueprints b
       JOIN exam_blueprints eb ON b.id = eb.blueprint_id
       WHERE eb.exam_id = $1
       ORDER BY eb.position ASC`,
      [examId]
    );

    const blueprints = blueprintsRes.rows;
    if (blueprints.length === 0) {
      // Clean up attempt
      await db.query("DELETE FROM exam_attempts WHERE id = $1", [newAttempt.id]);
      await db.query('COMMIT');
      return res.status(400).json({
        success: false,
        error: "Cannot start exam: No blueprints have been linked to this exam."
      });
    }

    const generatedQuestions = [];

    // Generate variants and insert into attempt_questions using variantService
    for (const bp of blueprints) {
      try {
        const variant = await generateAndStoreVariant({
          studentUid,
          blueprint: bp,
          examId,
          attemptId: newAttempt.id
        });
        generatedQuestions.push(variant);
      } catch (variantErr) {
        console.error(`Failed to generate variant for blueprint ${bp.id}:`, variantErr);
        await db.query('ROLLBACK');
        return res.status(500).json({
          success: false,
          error: "Failed to initialize exam session due to variant generation failure.",
          details: variantErr.message
        });
      }
    }

    // Update total questions count in attempt
    await db.query(
      "UPDATE exam_attempts SET total_questions = $1 WHERE id = $2",
      [generatedQuestions.length, newAttempt.id]
    );

    await db.query('COMMIT');

    return res.status(200).json({
      success: true,
      attemptId: newAttempt.id,
      questions: generatedQuestions,
      timeLeft: exam.duration_minutes * 60
    });

  } catch (error) {
    console.error("Failed to start exam:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to initialize exam session.",
      details: error.message
    });
  }
}

async function getExamQuestions(req, res) {
  const { examId } = req.params;
  const studentUid = req.user.uid;

  try {
    const activeAttemptRes = await db.query(
      "SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_uid = $2 AND status = 'ongoing' LIMIT 1",
      [examId, studentUid]
    );

    if (activeAttemptRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Exam session not started yet. Call start endpoint first."
      });
    }

    const attempt = activeAttemptRes.rows[0];
    const questionsRes = await db.query(
      "SELECT id, blueprint_id, question_text, options FROM attempt_questions WHERE attempt_id = $1 ORDER BY created_at ASC",
      [attempt.id]
    );

    // Calculate time remaining
    const examRes = await db.query("SELECT duration_minutes FROM exams WHERE id = $1 LIMIT 1", [examId]);
    const exam = examRes.rows[0];
    const startedAt = new Date(attempt.created_at).getTime();
    const now = new Date().getTime();
    const secondsElapsed = Math.floor((now - startedAt) / 1000);
    const totalSeconds = (exam ? exam.duration_minutes : 30) * 60;
    const remainingSeconds = Math.max(0, totalSeconds - secondsElapsed);

    return res.status(200).json({
      success: true,
      attemptId: attempt.id,
      questions: questionsRes.rows,
      timeLeft: remainingSeconds
    });

  } catch (error) {
    console.error("Failed to fetch exam questions:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve ongoing exam questions.",
      details: error.message
    });
  }
}

async function updateExamBlueprints(req, res) {
  const { examId } = req.params;
  const { blueprintIds } = req.body;

  if (!blueprintIds || !Array.isArray(blueprintIds)) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: blueprintIds must be an array."
    });
  }

  try {
    const examCheck = await db.query("SELECT status FROM exams WHERE id = $1 LIMIT 1", [examId]);
    if (examCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Exam not found." });
    }
    if (examCheck.rows[0].status !== "draft") {
      return res.status(400).json({
        success: false,
        error: "Cannot modify blueprints of an exam that is no longer in draft state."
      });
    }

    await db.query('BEGIN');
    await db.query("DELETE FROM exam_blueprints WHERE exam_id = $1", [examId]);

    if (blueprintIds.length > 0) {
      const insertValues = blueprintIds.map((id, i) => [examId, id, i]);
      const query = format("INSERT INTO exam_blueprints (exam_id, blueprint_id, position) VALUES %L", insertValues);
      await db.query(query);
    }
    await db.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Successfully linked ${blueprintIds.length} blueprints to the exam.`
    });
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error("Failed to update exam blueprints:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to update exam blueprints.",
      details: error.message
    });
  }
}

module.exports = {
  createExam,
  addQuestions,
  updateExamStatus,
  getExams,
  getExamDetails,
  submitExam,
  getExamResults,
  getStudentAttempts,
  startExam,
  getExamQuestions,
  updateExamBlueprints
};
