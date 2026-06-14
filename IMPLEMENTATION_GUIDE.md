# SecureExam AI - Implementation Guide
## Complete Code Architecture & Phase Blueprints

**Version:** 1.0  
**Last Updated:** June 14, 2026

---

## TABLE OF CONTENTS

1. [Project Structure Overview](#project-structure)
2. [Phase 2: Blueprint System - Deep Dive](#phase-2-blueprints)
3. [Phase 6: Variant Generation - Deep Dive](#phase-6-variants)
4. [Phase 8: Leak Traceability - Deep Dive](#phase-8-traceability)
5. [Service Layer Architecture](#service-layer)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)

---

## PROJECT STRUCTURE

### Updated Folder Organization

```
Examination-portal/
├── backend/
│   ├── config/
│   │   ├── db.js                      ✅ Existing
│   │   └── firebaseAdmin.js           ✅ Existing
│   │
│   ├── controllers/                   ← Modify these
│   │   ├── authController.js          ✅ Existing
│   │   ├── examController.js          ⚠️  ENHANCE for blueprint mode
│   │   ├── blueprintController.js     ✅ Existing (enhance)
│   │   ├── questionBankController.js  ✅ Existing
│   │   ├── adminController.js         ✅ Existing
│   │   └── leakController.js          🆕 NEW
│   │
│   ├── services/                      🆕 NEW LAYER
│   │   ├── variantService.js          🆕 Variant generation
│   │   ├── documentService.js         🆕 RAG document handling
│   │   ├── embeddingService.js        🆕 OpenAI embeddings
│   │   ├── vectorService.js           🆕 Qdrant operations
│   │   ├── blueprintGeneratorService.js 🆕 Gemini integration
│   │   ├── leakDetectionService.js    🆕 Fingerprinting & matching
│   │   ├── eventBus.js                🆕 Redis events
│   │   ├── auditService.js            🆕 Audit logging
│   │   └── blockchainService.js       🆕 Web3 integration
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js          ✅ Existing
│   │   ├── rbacMiddleware.js          🆕 NEW - Role-based access
│   │   ├── auditMiddleware.js         🆕 NEW - Audit logging
│   │   ├── errorHandler.js            🆕 NEW - Error handling
│   │   └── rateLimiter.js             🆕 NEW - Rate limiting
│   │
│   ├── utils/
│   │   ├── aiService.js               ✅ Existing
│   │   ├── variantEngine.js           ✅ Existing (enhance)
│   │   └── constants.js               🆕 NEW - App constants
│   │
│   ├── listeners/                     🆕 NEW - Event subscribers
│   │   ├── examStartedListener.js
│   │   ├── submissionReceivedListener.js
│   │   ├── leakDetectedListener.js
│   │   └── index.js
│   │
│   ├── server.js                      ✅ Existing (update routes)
│   ├── package.json                   ⚠️  ADD new dependencies
│   └── .env.example                   ⚠️  DOCUMENT all env vars
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx              ✅ Existing
│   │   │   ├── Signup.jsx             ✅ Existing
│   │   │   ├── StudentDashboard.jsx   ⚠️  ENHANCE for variant display
│   │   │   ├── FacultyDashboard.jsx   ⚠️  ENHANCE for blueprints
│   │   │   ├── AdminDashboard.jsx     ⚠️  ENHANCE with leak tools
│   │   │   ├── AttemptExam.jsx        ⚠️  ENHANCE for variants
│   │   │   └── BlueprintBuilder.jsx   🆕 NEW - Blueprint creator
│   │   │
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx     ✅ Existing
│   │   │   ├── ExamSelector.jsx       🆕 NEW - Select exam
│   │   │   ├── BlueprintForm.jsx      🆕 NEW - Create blueprints
│   │   │   ├── BlueprintCanvas.jsx    🆕 NEW - Visual editor
│   │   │   ├── DocumentUploader.jsx   🆕 NEW - RAG uploads
│   │   │   ├── VariantPreview.jsx     🆕 NEW - Show generated variants
│   │   │   ├── LeakReporter.jsx       🆕 NEW - Report leaks
│   │   │   └── AuditViewer.jsx        🆕 NEW - View audit logs
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                 ⚠️  ENHANCE with new endpoints
│   │   │   └── auth.js                ✅ Existing
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        ✅ Existing
│   │   │   └── ExamContext.jsx        🆕 NEW - Exam state
│   │   │
│   │   └── App.jsx                    ⚠️  UPDATE routes
│   │
│   └── package.json                   ⚠️  ADD dependencies (none needed actually)
│
├── SECUREEXAM_AI_SYSTEM_DESIGN.md     ✅ Created (this doc)
├── SECUREEXAM_AI_SQL_SCHEMA.sql       ✅ Created
├── IMPLEMENTATION_GUIDE.md            🆕 This file
├── API_DOCUMENTATION.md               🆕 NEW
├── TESTING_PLAN.md                    🆕 NEW
└── DEPLOYMENT_CHECKLIST.md            🆕 NEW

```

---

## PHASE 2: BLUEPRINT SYSTEM - DEEP DIVE

### Objective
Link exams directly to reusable question blueprints instead of storing static questions.

### Architecture Diagram
```
Faculty View:
┌──────────────────┐
│ Create Exam      │
│ (Draft Status)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Add Blueprints to Exam (NOT ?)   │
│ - Select from library            │
│ - Or create new                  │
│ - Reorder with drag-drop         │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ exam_blueprints          │
│ ├─ exam_id               │
│ ├─ blueprint_id          │
│ └─ position (order)      │
└────────┬─────────────────┘
         │
         ▼
[Publish Exam]
         │
         ▼
✅ Ready for variant generation
```

### Key Changes to examController.js

```javascript
// OLD METHOD (exam + questions) - DEPRECATED
async function addQuestions(req, res) {
  // Questions stored directly in questions table
  // All students see identical questions
}

// NEW METHOD (exam + blueprints) - USE THIS
async function updateExamBlueprints(req, res) {
  const { examId } = req.params;
  const { blueprintIds } = req.body; // [UUID1, UUID2, ...]
  const facultyUid = req.user.uid;

  // 1. Verify exam exists and belongs to this faculty (or is admin)
  const examRes = await db.query(
    "SELECT id, created_by, status FROM exams WHERE id=$1",
    [examId]
  );
  
  if (examRes.rows.length === 0) {
    return res.status(404).json({ error: "Exam not found" });
  }

  const exam = examRes.rows[0];
  const isOwner = exam.created_by === facultyUid;
  const isAdmin = await checkAdminRole(facultyUid);
  
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  // 2. Verify exam is in draft state (can only modify draft)
  if (exam.status !== 'draft') {
    return res.status(400).json({ 
      error: `Cannot modify blueprints for exam in '${exam.status}' state` 
    });
  }

  try {
    // 3. Clear existing blueprint links
    await db.query(
      "DELETE FROM exam_blueprints WHERE exam_id=$1",
      [examId]
    );

    // 4. Verify all blueprints exist
    const placeholders = blueprintIds.map((_, i) => `$${i+2}`).join(',');
    const blueprintsRes = await db.query(
      `SELECT id FROM blueprints WHERE id IN (${placeholders})`,
      [examId, ...blueprintIds]
    );

    if (blueprintsRes.rows.length !== blueprintIds.length) {
      return res.status(400).json({ 
        error: `Some blueprints not found (${blueprintsRes.rows.length}/${blueprintIds.length})` 
      });
    }

    // 5. Insert new blueprint links with position
    const updates = blueprintIds.map((bpId, idx) => ([
      examId, bpId, idx
    ]));

    for (let i = 0; i < updates.length; i++) {
      const [exam_id, blueprint_id, position] = updates[i];
      await db.query(
        `INSERT INTO exam_blueprints (exam_id, blueprint_id, position)
         VALUES ($1, $2, $3)`,
        [exam_id, blueprint_id, position]
      );
    }

    // 6. Update exam setting
    await db.query(
      `UPDATE exams SET questions_mode='BLUEPRINT' WHERE id=$1`,
      [examId]
    );

    // 7. Emit event
    await eventBus.publish('BlueprintsAttachedToExam', {
      examId,
      blueprintCount: blueprintIds.length
    });

    return res.json({
      success: true,
      message: `Successfully attached ${blueprintIds.length} blueprints to exam`,
      data: { examId, blueprintCount: blueprintIds.length }
    });

  } catch (error) {
    console.error("Failed to update exam blueprints:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update exam blueprints",
      details: error.message
    });
  }
}

// NEW METHOD: Get blueprints for exam
async function getExamBlueprints(req, res) {
  const { examId } = req.params;

  try {
    const res = await db.query(`
      SELECT b.* FROM blueprints b
      INNER JOIN exam_blueprints eb ON b.id = eb.blueprint_id
      WHERE eb.exam_id=$1
      ORDER BY eb.position ASC
    `, [examId]);

    return res.json({
      success: true,
      data: res.rows,
      count: res.rows.length
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

### Frontend: BlueprintSelector Component

```jsx
// frontend/src/components/BlueprintSelector.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function BlueprintSelector({ examId, onUpdate }) {
  const [allBlueprints, setAllBlueprints] = useState([]);
  const [selectedBlueprints, setSelectedBlueprints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const fetchBlueprints = async () => {
    try {
      const res = await axios.get('/api/blueprints');
      setAllBlueprints(res.data.data);
    } catch (error) {
      console.error('Failed to fetch blueprints:', error);
    }
  };

  const handleAddBlueprint = (blueprint) => {
    if (!selectedBlueprints.find(b => b.id === blueprint.id)) {
      setSelectedBlueprints([...selectedBlueprints, blueprint]);
    }
  };

  const handleRemoveBlueprint = (blueprintId) => {
    setSelectedBlueprints(selectedBlueprints.filter(b => b.id !== blueprintId));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/exams/${examId}/blueprints`, {
        blueprintIds: selectedBlueprints.map(b => b.id)
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update blueprints:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3>Attach Blueprints to Exam</h3>
      
      {/* Available blueprints */}
      <div className="mt-4">
        <h4>Available Blueprints</h4>
        {allBlueprints.map(bp => (
          <div key={bp.id} className="flex justify-between items-center p-2 border mb-2">
            <span>{bp.title} ({bp.difficulty})</span>
            <button onClick={() => handleAddBlueprint(bp)}>+ Add</button>
          </div>
        ))}
      </div>

      {/* Selected blueprints */}
      <div className="mt-4">
        <h4>Selected Blueprints ({selectedBlueprints.length})</h4>
        {selectedBlueprints.map((bp, idx) => (
          <div key={bp.id} className="flex justify-between items-center p-2 bg-green-100 mb-2 rounded">
            <span>{idx + 1}. {bp.title}</span>
            <button onClick={() => handleRemoveBlueprint(bp.id)}>Remove</button>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Blueprints'}
      </button>
    </div>
  );
}
```

---

## PHASE 6: VARIANT GENERATION - DEEP DIVE

### Objective
Generate unique question papers for each student on exam start.

### Workflow Sequence

```
Timeline when Student Clicks "Start Exam"
────────────────────────────────────────

T0: Request /api/exams/{examId}/start
    ↓
T1: Backend creates exam_attempts record (status='in_progress')
    ↓
T2: For each blueprint attached to exam:
    │
    ├─ Generate Seed: SHA256(studentId + blueprintId + timestamp)
    ├─ Create PRNG(seed)
    ├─ Select variable set from blueprint.variable_sets
    ├─ Substitute template with variables
    ├─ Generate question text & options
    ├─ Compute correct answer
    ├─ Generate SHA256 fingerprint
    ├─ Create attempt_questions record (LOCKED)
    └─ Push to question_audit_log
    ↓
T3: Return all generated questions to frontend
    ↓
T4: Student sees unique paper (same every page refresh due to locked attempt_questions)
```

### Enhanced variantEngine.js

```javascript
// backend/utils/variantEngine.js
const crypto = require('crypto');

class VariantGenerator {
  constructor(studentId, blueprintId, examId) {
    this.studentId = studentId;
    this.blueprintId = blueprintId;
    this.examId = examId;
    this.seed = this.generateSeed();
    this.prng = createPRNG(this.seed);
  }

  generateSeed() {
    // Deterministic seed generation
    const input = `${this.studentId}:${this.blueprintId}:${this.examId}:v1`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  selectVariableSet(variableSets) {
    // Use PRNG to consistently select same set for same seed
    const index = Math.floor(this.prng() * variableSets.length);
    return variableSets[index];
  }

  generateVariant(blueprint) {
    // Select variables using PRNG
    const selectedVariables = this.selectVariableSet(blueprint.variable_sets);

    // Generate question text
    const questionText = this.substituteTemplate(
      blueprint.template_text,
      selectedVariables
    );

    // Generate options
    const options = blueprint.options_templates.map(optTemplate =>
      this.substituteTemplate(optTemplate, selectedVariables)
    );

    // Find correct option index
    const correctAnswerText = this.substituteTemplate(
      blueprint.correct_option_template,
      selectedVariables
    );
    const correctOption = options.findIndex(opt => opt === correctAnswerText);

    // Generate fingerprint
    const questionHash = this.generateFingerprint(
      questionText,
      options,
      this.seed
    );

    return {
      questionText,
      options,
      correctOption,
      correctAnswerText,
      selectedVariables,
      seed: this.seed,
      questionHash,
      generatedAt: new Date()
    };
  }

  substituteTemplate(template, variables) {
    let result = template;
    
    // Sort keys by length descending to avoid substring collision
    const keys = Object.keys(variables).sort((a, b) => b.length - a.length);
    
    // Replace {{variable}} placeholders
    for (const key of keys) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, variables[key]);
    }

    // Evaluate arithmetic expressions {{A+B}} after variable substitution
    result = result.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
      return evaluateArithmetic(expr, variables);
    });

    return result;
  }

  generateFingerprint(questionText, options, seed) {
    // SHA256 hash for leak detection
    const fingerprintInput = JSON.stringify({
      questionText,
      options: options.sort(), // Consistent ordering
      seed,
      timestamp: new Date().toISOString()
    });

    return crypto
      .createHash('sha256')
      .update(fingerprintInput)
      .digest('hex');
  }
}

// Enhanced createPRNG with mulberry32
function createPRNG(seed) {
  let s = parseInt(seed.substring(0, 8), 16) || 12345;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Safe arithmetic evaluator (already in codebase, optimized)
function evaluateArithmetic(expr, variables) {
  // Tokenize and parse safely
  const tokens = expr.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
  
  // Replace variables with values
  const resolvedExpr = expr;
  for (const [key, value] of Object.entries(variables)) {
    expr = expr.replaceAll(`{${key}}`, String(value));
  }
  
  // Recursive descent parser
  try {
    let index = 0;
    const result = parseExpression();
    return Number.isInteger(result) ? result : Math.round(result * 10000) / 10000;
  } catch (error) {
    console.error("Evaluation error:", expr, error);
    return 0;
  }

  function parseExpression() {
    return parseAddSub();
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const op = tokens[index++];
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePrimary();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const op = tokens[index++];
      const right = parsePrimary();
      left = op === '*' ? left * right : right !== 0 ? left / right : 0;
    }
    return left;
  }

  function parsePrimary() {
    if (tokens[index] === '(') {
      index++;
      const val = parseExpression();
      index++; // skip ')'
      return val;
    }
    const token = tokens[index++];
    return parseFloat(token) || 0;
  }
}

module.exports = { VariantGenerator, createPRNG, evaluateArithmetic };
```

### Updated examController.startExam()

```javascript
// backend/controllers/examController.js
const { VariantGenerator } = require('../utils/variantEngine');

async function startExam(req, res) {
  const { examId } = req.params;
  const studentUid = req.user.uid;

  try {
    // 1. Verify exam exists and is published
    const examRes = await db.query(
      "SELECT * FROM exams WHERE id=$1",
      [examId]
    );

    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const exam = examRes.rows[0];

    // Check exam is published and within time window
    const now = new Date();
    if (exam.status !== 'published') {
      return res.status(400).json({ error: "Exam is not published" });
    }
    if (exam.start_time && now < new Date(exam.start_time)) {
      return res.status(400).json({ error: "Exam has not started yet" });
    }
    if (exam.end_time && now > new Date(exam.end_time)) {
      return res.status(400).json({ error: "Exam has ended" });
    }

    // 2. Check if student already has an active attempt
    let attemptRes = await db.query(
      "SELECT id FROM exam_attempts WHERE exam_id=$1 AND student_uid=$2 AND status='in_progress' LIMIT 1",
      [examId, studentUid]
    );

    let attemptId;

    if (attemptRes.rows.length > 0) {
      // Existing attempt, return existing questions
      attemptId = attemptRes.rows[0].id;
    } else {
      // Create new attempt
      const createRes = await db.query(
        `INSERT INTO exam_attempts 
         (exam_id, student_uid, score, total_questions, percentage, passed, status, started_at)
         VALUES ($1, $2, 0, 0, 0, FALSE, 'in_progress', NOW())
         RETURNING id`,
        [examId, studentUid]
      );

      attemptId = createRes.rows[0].id;

      // 3. Get blueprints for this exam
      const blueprintsRes = await db.query(
        `SELECT b.* FROM blueprints b
         INNER JOIN exam_blueprints eb ON b.id = eb.blueprint_id
         WHERE eb.exam_id=$1
         ORDER BY eb.position ASC`,
        [examId]
      );

      // 4. Generate variants for each blueprint
      for (const blueprint of blueprintsRes.rows) {
        const variantGen = new VariantGenerator(studentUid, blueprint.id, examId);
        const variant = variantGen.generateVariant(blueprint);

        // Store in attempt_questions (locked)
        await db.query(
          `INSERT INTO attempt_questions
           (attempt_id, blueprint_id, variant_seed, question_text, options, 
            correct_option, correct_answer_text, selected_variables, question_hash, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            attemptId,
            blueprint.id,
            variant.seed,
            variant.questionText,
            JSON.stringify(variant.options),
            variant.correctOption,
            variant.correctAnswerText,
            JSON.stringify(variant.selectedVariables),
            variant.questionHash
          ]
        );

        // Log to audit trail
        await db.query(
          `INSERT INTO question_audit_log
           (blueprint_id, student_id, attempt_id, exam_id, question_hash, seed, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            blueprint.id,
            studentUid,
            attemptId,
            examId,
            variant.questionHash,
            variant.seed
          ]
        );
      }

      // Emit event
      await eventBus.publish('ExamStarted', {
        examId,
        studentId: studentUid,
        attemptId,
        questionCount: blueprintsRes.rows.length
      });
    }

    // 5. Retrieve locked questions for student
    const questionsRes = await db.query(
      `SELECT id, question_text, options FROM attempt_questions
       WHERE attempt_id=$1
       ORDER BY created_at ASC`,
      [attemptId]
    );

    return res.json({
      success: true,
      attemptId,
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.duration_minutes,
        passingPercentage: exam.passing_percentage
      },
      questions: questionsRes.rows.map((q, idx) => ({
        id: q.id,
        number: idx + 1,
        questionText: q.question_text,
        options: JSON.parse(q.options)
      }))
    });

  } catch (error) {
    console.error("Failed to start exam:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { ..., startExam };
```

---

## PHASE 8: LEAK TRACEABILITY - DEEP DIVE

### Objective
Detect and trace paper leaks using SHA256 fingerprints.

### Service: LeakDetectionService

```javascript
// backend/services/leakDetectionService.js
const crypto = require('crypto');
const db = require('../config/db');

class LeakDetectionService {
  /**
   * Generate fingerprint for a question
   */
  static generateFingerprint(questionText, options) {
    const input = JSON.stringify({
      questionText: questionText.trim(),
      options: options.map(o => o.trim()).sort()
    });
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Report suspected paper leak
   */
  static async reportLeak(sourceUrl, leakedQuestionTexts) {
    // Generate hashes for all leaked questions
    const leakedHashes = leakedQuestionTexts.map(qt => 
      this.generateFingerprint(qt, [])
    );

    // Create investigation record
    const res = await db.query(
      `INSERT INTO leak_investigations
       (source_url, leaked_question_hashes, investigation_status)
       VALUES ($1, $2, 'OPEN')
       RETURNING id`,
      [sourceUrl, leakedHashes]
    );

    return res.rows[0].id;
  }

  /**
   * Investigate leak: match fingerprints to students
   */
  static async investigateLeak(investigationId) {
    // Get investigation details
    const invRes = await db.query(
      "SELECT leaked_question_hashes FROM leak_investigations WHERE id=$1",
      [investigationId]
    );

    if (invRes.rows.length === 0) {
      throw new Error("Investigation not found");
    }

    const leakedHashes = invRes.rows[0].leaked_question_hashes;

    // Find matches in audit log
    const matchesRes = await db.query(
      `SELECT student_id, exam_id, attempt_id, question_hash, COUNT(*) as matches
       FROM question_audit_log
       WHERE question_hash = ANY($1)
       GROUP BY student_id, exam_id, attempt_id, question_hash`,
      [leakedHashes]
    );

    // Aggregate by student
    const suspectMap = {};
    for (const match of matchesRes.rows) {
      if (!suspectMap[match.student_id]) {
        suspectMap[match.student_id] = {
          studentId: match.student_id,
        examId: match.exam_id,
          attemptId: match.attempt_id,
          matchedQuestions: []
        };
      }
      suspectMap[match.student_id].matchedQuestions.push({
        questionHash: match.question_hash,
        count: match.matches
      });
    }

    const suspects = Object.values(suspectMap);

    // Calculate match confidence (how many leaked questions matched)
    const matchConfidence = suspects.length > 0 
      ? (suspects[0].matchedQuestions.length / leakedHashes.length)
      : 0;

    // Determine severity
    let severity = 'LOW';
    if (matchConfidence > 0.8) severity = 'CRITICAL';
    else if (matchConfidence > 0.5) severity = 'HIGH';
    else if (matchConfidence > 0.3) severity = 'MEDIUM';

    // Update investigation
    await db.query(
      `UPDATE leak_investigations
       SET matched_students=$1, match_confidence=$2, incident_severity=$3,
           investigation_status='IN_PROGRESS'
       WHERE id=$4`,
      [
        suspects.map(s => s.studentId),
        matchConfidence,
        severity,
        investigationId
      ]
    );

    return {
      investigationId,
      severity,
      matchConfidence,
      suspects
    };
  }

  /**
   * Log disciplinary action
   */
  static async logDisciplinaryAction(studentId, examId, action, notes) {
    await db.query(
      `INSERT INTO leak_investigations
       (investigation_status, actions_taken, resolved_at)
       VALUES ('RESOLVED', $1, NOW())`,
      [`${action}: ${notes}`]
    );

    // Emit event for alerts
    await eventBus.publish('DisciplinaryActionTaken', {
      studentId,
      examId,
      action,
      timestamp: new Date()
    });
  }
}

module.exports = LeakDetectionService;
```

### Controller: Leak Investigation Endpoints

```javascript
// backend/controllers/leakController.js
const LeakDetectionService = require('../services/leakDetectionService');

async function reportLeak(req, res) {
  const { sourceUrl, leakedQuestionTexts } = req.body;
  const adminUid = req.user.uid;

  if (!Array.isArray(leakedQuestionTexts) || leakedQuestionTexts.length === 0) {
    return res.status(400).json({ error: "At least 1 question required" });
  }

  try {
    const investigationId = await LeakDetectionService.reportLeak(
      sourceUrl,
      leakedQuestionTexts
    );

    // Emit event
    await eventBus.publish('LeakReported', {
      investigationId,
      reportedBy: adminUid,
      questionCount: leakedQuestionTexts.length
    });

    return res.json({
      success: true,
      investigationId,
      message: "Leak reported. Starting investigation..."
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function investigateLeak(req, res) {
  const { investigationId } = req.params;

  try {
    const result = await LeakDetectionService.investigateLeak(investigationId);

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { reportLeak, investigateLeak };
```

---

## SERVICE LAYER ARCHITECTURE

### New Services to Implement

```
backend/services/
├── variantService.js
│   └── Orchestrates variant generation, seed management
│
├── documentService.js
│   ├── uploadDocument()
│   ├── parseDocument()
│   ├── chunkDocument()
│   └── deleteDocument()
│
├── embeddingService.js
│   ├── generateEmbedding()
│   ├── batchEmbeddings()
│   └── getModelInfo()
│
├── vectorService.js
│   ├── connectToQdrant()
│   ├── addChunks()
│   ├── searchSimilar()
│   ├── deleteChunks()
│   └── freezeCollection()
│
├── blueprintGeneratorService.js
│   ├── generateFromRAG()
│   ├── validateBlueprint()
│   └── convertCandidateToBlueprint()
│
├── leakDetectionService.js (shown above)
│   ├── reportLeak()
│   ├── investigateLeak()
│   └── logDisciplinaryAction()
│
├── eventBus.js
│   ├── publish()
│   ├── subscribe()
│   └── unsubscribe()
│
├── auditService.js
│   ├── logAction()
│   ├── logAccessDenied()
│   └── getAuditLog()
│
└── blockchainService.js
    ├── recordFingerprint()
    ├── issueCertificate()
    └── verify Credential()
```

---

## INTEGRATION POINTS

### Route Registration (server.js changes)

```javascript
// Add to server.js routes section

// ===== BLUEPRINT ROUTES (PHASE 2) =====
app.post('/api/exams/:examId/blueprints', verifyFacultyOrAdmin, 
  examController.updateExamBlueprints);
app.get('/api/exams/:examId/blueprints', verifyToken, 
  examController.getExamBlueprints);

// ===== VARIANT GENERATION ROUTES (PHASE 6) =====
app.post('/api/exams/:examId/start', verifyToken, 
  examController.startExam);
app.get('/api/attempts/:attemptId/questions', verifyToken, 
  examController.getAttemptQuestions);

// ===== LEAK DETECTION ROUTES (PHASE 8) =====
app.post('/api/leak/report', verifyAdmin, leakController.reportLeak);
app.post('/api/leak/investigate/:investigationId', verifyAdmin, 
  leakController.investigateLeak);
app.get('/api/leak/investigations', verifyAdmin, 
  leakController.listInvestigations);
```

---

## TESTING STRATEGY

### Unit Tests (Jest)

```javascript
// backend/__tests__/variantEngine.test.js
const { VariantGenerator } = require('../utils/variantEngine');

describe('VariantGenerator', () => {
  it('generates consistent seed for same inputs', () => {
    const gen1 = new VariantGenerator('student1', 'blueprint1', 'exam1');
    const gen2 = new VariantGenerator('student1', 'blueprint1', 'exam1');
    
    expect(gen1.seed).toBe(gen2.seed);
  });

  it('generates different seeds for different students', () => {
    const gen1 = new VariantGenerator('student1', 'blueprint1', 'exam1');
    const gen2 = new VariantGenerator('student2', 'blueprint1', 'exam1');
    
    expect(gen1.seed).not.toBe(gen2.seed);
  });

  it('substitutes variables correctly', () => {
    const blueprint = {
      template_text: 'What is {{A}} + {{B}}?',
      options_templates: ['{{A+B}}', '{{A-B}}', '{{A*B}}'],
      correct_option_template: '{{A+B}}',
      variable_sets: [{ A: 10, B: 20 }]
    };

    const gen = new VariantGenerator('s1', 'b1', 'e1');
    const variant = gen.generateVariant(blueprint);

    expect(variant.questionText).toBe('What is 10 + 20?');
    expect(variant.options).toContain('30');
  });

  it('generates same variant for same seed', () => {
    // This is critical for immutability
  });
});
```

### Integration Tests

```javascript
// backend/__tests__/examFlow.integration.test.js
describe('Exam Flow Integration', () => {
  it('should create exam, attach blueprints, generate variants', async () => {
    // 1. Create exam
    // 2. Attach blueprints
    // 3. Publish exam
    // 4. Student starts quiz
    // 5. Verify variants generated
    // 6. Student refreshes page
    // 7. Verify same variants returned
  });

  it('should lock attempt questions after start', async () => {
    // Verify attempt_questions table has immutable trigger
  });
});
```

### E2E Tests (Cypress)

```javascript
// frontend/cypress/e2e/student-exam-flow.cy.js
describe('Student Exam Flow with Variants', () => {
  it('should display unique questions to different students', () => {
    // Login as Student1
    // Start exam
    // Note questions
    // Logout
    // Login as Student2
    // Start same exam
    // Verify questions different
  });

  it('should maintain same questions on page refresh', () => {
    // Start exam
    // Note question 1
    // Refresh page
    // Verify question 1 unchanged
  });
});
```

---

## NEXT STEPS

1. **Implement Phase 2 (Blueprint System)** - 8-10 hours
   - Update examController
   - Create BlueprintSelector UI
   - Test blueprint attachment

2. **Implement Phase 6 (Variants)** - 10-12 hours
   - Integrate VariantGenerator
   - Update exam start flow
   - Test variant consistency

3. **Test & Deploy Phase 1** - 6-8 hours
   - Full end-to-end testing
   - Load testing
   - Production deployment

Then proceed with phases 3-5 (RAG), then 7-12 (remaining phases).

---

**Document Status:** Ready for Implementation  
**Total Estimated Hours:** 90-110 hours across 2 weeks

