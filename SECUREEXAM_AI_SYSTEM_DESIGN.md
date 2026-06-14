# SecureExam AI - Zero-Trust Dynamic Examination Platform
## Complete System Design & Architecture

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** Design Phase  
**Project Type:** Personal Long-term Project (1-2 weeks development)

---

## TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#phase-1-current-system-analysis)
3. [Architecture Transformation](#architecture-transformation)
4. [Phase-by-Phase Implementation Guide](#phase-by-phase-implementation)
5. [Database Schema](#database-schema)
6. [API Specifications](#api-specifications)
7. [Development Roadmap](#development-roadmap)
8. [Technology Stack](#technology-stack)

---

## EXECUTIVE SUMMARY

### Current Problem
Traditional examination model stores and delivers questions directly to students, creating:
- **Paper Leak Risks**: All students see identical question papers
- **Insider Threats**: Faculty/Admins can view all questions before exam
- **No Variance**: No mechanism to distinguish unique questions per student
- **Poor Audit Trail**: Difficult to trace paper leakage

### SecureExam AI Solution
A **blueprint-driven dynamic examination platform** that:
- ✅ **Generates unique question papers** for each student using reusable blueprints
- ✅ **Minimizes paper leaks** through dynamic variant generation and traceability
- ✅ **Prevents insider threats** with role-based access controls
- ✅ **Provides comprehensive audit trail** with SHA256 fingerprinting
- ✅ **Integrates blockchain** for immutable credential verification
- ✅ **Implements RAG** for AI-powered blueprint generation from uploaded documents

### Key Innovation
Instead of storing final questions, faculty creates **blueprints** with variables:

```
Blueprint Template: "What is {{A}} + {{B}}?"
Variables Set 1:   A=10, B=20  → Generated: "What is 10 + 20?"
Variables Set 2:   A=50, B=75  → Generated: "What is 50 + 75?"
Variables Set N:   A=X,  B=Y   → Generated: "What is X + Y?"
```

Each student gets **unique variants** with **locked responses** throughout the exam.

---

## PHASE 1: CURRENT SYSTEM ANALYSIS

### 1.1 Frontend Architecture

**Structure:**
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              (Firebase auth)
│   │   ├── Signup.jsx             (Role registration)
│   │   ├── StudentDashboard.jsx   (Student home, view exams)
│   │   ├── FacultyDashboard.jsx   (Faculty: create exams, questions)
│   │   ├── AdminDashboard.jsx     (Admin: analytics, system control)
│   │   └── AttemptExam.jsx        (Try exam, submit answers)
│   ├── components/
│   │   ├── ProtectedRoute.jsx     (Auth guard)
│   │   └── [...other UI components]
│   ├── context/
│   │   └── AuthContext.jsx        (User state management)
│   ├── firebase.js                (Firebase init)
│   └── App.jsx                    (Router)
├── package.json                   (React 19, Vite, TailwindCSS)
└── tailwind.config.js
```

**Tech Stack:**
- React 19.2.6 with Vite bundler
- TailwindCSS for styling
- Firebase for authentication
- React Router for navigation
- Axios for API calls

**Authentication Flow:**
1. User signs up via Signup.jsx
2. Firebase creates account
3. Backend receives verified token
4. User registered in PostgreSQL with role
5. Protected routes enforce authorization

### 1.2 Backend Architecture

**Structure:**
```
backend/
├── config/
│   ├── db.js                 (PostgreSQL pool - Neon)
│   └── firebaseAdmin.js      (Firebase service account)
├── controllers/
│   ├── authController.js     (Register, login, getCurrentUser)
│   ├── examController.js     (CRUD exams, questions, submissions)
│   ├── blueprintController.js (Blueprint CRUD, variant generation)
│   ├── questionBankController.js (Document upload, processing)
│   └── adminController.js    (Analytics, system settings)
├── middleware/
│   └── authMiddleware.js     (JWT verification, role checks)
├── utils/
│   ├── aiService.js          (Gemini integration)
│   └── variantEngine.js      (PRNG, arithmetic evaluation)
├── uploads/                  (Document storage)
├── server.js                 (Express app, routes)
└── package.json              (Node.js dependencies)
```

**Tech Stack:**
- Express.js for API
- PostgreSQL (Neon) for persistence
- Firebase Admin SDK for authentication
- Multer for file uploads
- Axios for external API calls
- pdf-parse for PDF extraction

### 1.3 Database Schema (Current)

**Core Tables:**
```
users:                  (Firebase UID, email, role, name)
exams:                  (Title, description, status, timing, credentials)
questions:              (exam_id, question_text, options[], correct_option)
exam_attempts:          (exam_id, student_uid, score, passed, submitted_at)

└─ NEW TABLES (Partially Implemented):
   blueprints:          (Template-based question generator)
   exam_blueprints:     (Link exams to blueprints)
   attempt_questions:   (Lock generated questions per attempt)
   uploaded_documents:  (RAG document storage)
   topics:              (Extracted from documents)
   concept_candidates:  (LLM-generated concepts)
   blueprint_candidates:(Generated blueprints pending review)
```

### 1.4 Existing Workflow

**Exam Creation Flow:**
```
Faculty logs in
   ↓
Create exam (draft status)
   ↓
Add questions manually (all students see same)
   ↓
Publish exam
   ↓
Students take exam
   ↓
System grades (fixed correct_option)
   ↓
Submit score to blockchain
```

**Problems:**
- ❌ Same questions for all students
- ❌ No variant generation
- ❌ No attempt locking
- ❌ Paper easily leaked
- ❌ No document-based blueprint generation

### 1.5 Blockchain Integration

**Current:**
- Smart Contract: `CredentialRegistry.sol` on Polygon Amoy
- Stores: Credential hashes, verification proofs
- Issue: No traceability of variant fingerprints

---

## ARCHITECTURE TRANSFORMATION

### Before → After Mapping

```
LEGACY SYSTEM                          SECUREEXAM AI SYSTEM
==================                     ====================

Questions stored                  →    Blueprints stored (templates + variables)
   ↓                                        ↓
All students get same questions    →    Each student gets unique variants
   ↓                                        ↓
Faculty uploads PDF/zip            →    RAG pipeline: Document → Vector DB
   ↓                                        ↓
Manual question creation            →    AI Blueprint Generator (Gemini)
   ↓                                        ↓
No attempt locking                 →    AttemptQuestions locked immutably
   ↓                                        ↓
Static credentials                 →    Dynamic variant + SHA256 fingerprint
   ↓                                        ↓
No leak traceability               →    Audit log + blockchain integration
   ↓                                        ↓
No event system                    →    Redis Pub/Sub event bus
```

---

## PHASE-BY-PHASE IMPLEMENTATION

### PHASE 2: BLUEPRINT SYSTEM

**Objective:** Replace manual question creation with reusable blueprint templates

**New Entity: Blueprint**
```sql
CREATE TABLE blueprints (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    difficulty VARCHAR(50),              -- Easy, Medium, Hard
    question_type VARCHAR(50),           -- multiple-choice, short-answer, etc.
    learning_objective TEXT,             -- STL/Bloom's taxonomy
    template_text TEXT NOT NULL,         -- "What is {{A}} + {{B}}?"
    options_templates TEXT[],            -- ["{{A+B}}", "{{A-B}}", "{{A*B}}", "{{A/B}}"]
    correct_option_template TEXT,        -- "{{A+B}}"
    variable_sets JSONB NOT NULL,        -- [{"A": 10, "B": 20}, {"A": 50, "B": 30}, ...]
    tags TEXT[],                         -- For categorization
    created_by VARCHAR(255),             -- Faculty UID
    created_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE'  -- ACTIVE, DEPRECATED, ARCHIVED
);
```

**New Entity: ExamBlueprints (Link Table)**
```sql
CREATE TABLE exam_blueprints (
    exam_id UUID REFERENCES exams(id),
    blueprint_id UUID REFERENCES blueprints(id),
    position INTEGER,                    -- Order in exam
    PRIMARY KEY (exam_id, blueprint_id)
);
```

**Faculty Workflow:**
```
1. Faculty logs in
   ↓
2. Select exam (in draft status)
   ↓
3. Instead of "Add Questions", click "Add Blueprints"
   ↓
4. Select/create blueprints from library
   ↓
5. Blueprints attached to exam (not finalized questions)
   ↓
6. Publish exam
   ↓
7. System ready for dynamic generation
```

**API Endpoints:**

```
POST   /api/blueprints
       Create new blueprint
       Request: {
         title, topic, difficulty, questionType, learningObjective,
         templateText, optionsTemplates, correctOptionTemplate, variableSets, tags
       }
       Response: { success, data: blueprint }

GET    /api/blueprints
       List all blueprints
       Response: { success, data: [blueprints] }

GET    /api/blueprints/:id
       Get blueprint details

PUT    /api/blueprints/:id
       Update blueprint

DELETE /api/blueprints/:id
       Deprecate blueprint (soft delete)

POST   /api/exams/:examId/blueprints
       Attach blueprints to exam
       Request: { blueprintIds: [id1, id2, ...] }

GET    /api/exams/:examId/blueprints
       Get blueprints for exam
```

**Implementation Notes:**
- ✅ Tables already created
- ✅ Basic CRUD operations partially implemented
- ⚠️  Need to update ExamController to handle blueprint linking
- ⚠️  Need UI component for blueprint selector in FacultyDashboard

---

### PHASE 3: RAG KNOWLEDGE BASE

**Objective:** Enable faculty to upload documents and convert them into blueprint candidates

**Technology Stack:**
- **Vector DB:** Qdrant (self-hosted or managed)
- **Embeddings:** OpenAI Text Embedding 3 or open-source (Sentence Transformers)
- **Document Parsing:** pdf-parse (already in project)
- **LLM:** Gemini 2.5 Flash (already in project)

**Pipeline:**
```
Upload (PDF/DOCX/PPTX/TXT)
    ↓ (Multer)
Parse Content
    ↓ (pdf-parse or txt read)
Chunk Text
    ↓ (Split into 512-token chunks with overlap)
Generate Embeddings
    ↓ (OpenAI API or local model)
Store in Qdrant
    ↓ (Point store with metadata)
Index Ready for RAG
```

**Data Model:**

```sql
-- Already in schema, needs enhancement:
uploaded_documents:
  id, file_name, uploaded_by, uploaded_at, processing_status,
  report_json, parsed_json, knowledge_base_status (ACTIVE/FROZEN/ARCHIVED)

-- New table for vector chunks:
CREATE TABLE vector_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES uploaded_documents(id),
    chunk_index INTEGER,
    chunk_text TEXT,
    token_count INTEGER,
    vector_id UUID,                  -- Reference to Qdrant point ID
    embedding_model VARCHAR(100),    -- "openai-embedding-3" or "sentence-transformers"
    metadata JSONB,                  -- {course, subject, semester, examId, etc.}
    created_at TIMESTAMP
);

-- Track RAG knowledge base status per exam:
CREATE TABLE rag_knowledge_bases (
    id UUID PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) UNIQUE,
    status VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE, FROZEN, ARCHIVED
    documents_count INTEGER,
    chunks_count INTEGER,
    frozen_at TIMESTAMP,
    created_at TIMESTAMP
);
```

**New Services:**

```javascript
// services/DocumentService.js
- uploadDocument(file, metadata)    // Multer + file validation
- parseDocument(documentId)         // Extract text
- chunkDocument(text)               // Split into segments
- deleteDocument(documentId)        // Clean up

// services/EmbeddingService.js
- generateEmbedding(text)           // Call OpenAI API
- batchEmbeddings(texts)            // Batch processing
- getModelName()                    // Return model version

// services/VectorService.js
- connectToQdrant(url, apiKey)      // Initialize client
- addChunks(chunks)                 // Upsert to Qdrant
- searchSimilar(query, topK=5)      // Vector search
- freezeCollection(examId)          // Lock collection
- unfreezeCollection(examId)        // Unlock (admin only)
- deleteChunks(documentId)          // Remove document vectors
```

**API Endpoints:**

```
POST   /api/knowledge-base/upload
       Upload document for RAG
       Request: { file (multipart), examId (optional) }
       Response: { success, data: document }

POST   /api/knowledge-base/process/:documentId
       Parse and embed document
       Response: { success, status: PROCESSING, chunks: 150 }

GET    /api/knowledge-base/status/:examId
       Get RAG KB status (ACTIVE/FROZEN/ARCHIVED)

POST   /api/knowledge-base/freeze/:examId
       Freeze KB (no new uploads allowed after scheduling)
       
POST   /api/knowledge-base/search
       Search vector DB (internal, for blueprint generator)
       Request: { query, topK }
       Response: { success, data: [chunks] }

DELETE /api/knowledge-base/:documentId
       Remove document (only if KB ACTIVE)
```

---

### PHASE 4: AI BLUEPRINT GENERATOR

**Objective:** Faculty enters a prompt, system generates candidate blueprints from RAG

**Workflow:**

```
Faculty Input:
  "Generate 20 networking questions on TCP/IP from Module 3"
    ↓ (Parse intent, extract topic/count/module)
Vector Search:
  Query Qdrant for relevant chunks on [TCP/IP, networking]
    ↓ (Retrieve top-10 chunks with context)
LLM Prompt:
  "Using these networking concepts: [chunks], generate 20 unique question templates..."
    ↓ (Call Gemini 2.5 Flash)
Blueprint Candidates:
  LLM returns JSON: [{template, variables, correctLogic}, ...]
    ↓ (Save as candidates in DB)
Manual Review:
  Faculty reviews candidates, approves/rejects
    ↓
Convert to Blueprints:
  Approved candidates → blueprints table
```

**LLM Prompt Design:**

```
System Prompt:
"You are an expert question generator for academic exams. 
Generate question templates that can be instantiated with different variable sets.
Each template must have clear correct answers and support variant generation."

User Prompt Example:
"From the following knowledge base chunks about TCP/IP:
[Chunk 1: TCP uses three-way handshake...]
[Chunk 2: MSS negotiation affects transmission...]
[Chunk 3: TCP congestion control has multiple phases...]

Generate 5 question templates in JSON format:
{
  "questions": [
    {
      "template": "What is the purpose of TCP {{field}} in the {{protocol_phase}} phase?",
      "variables": [
        {"field": "SYN flag", "protocol_phase": "connection establishment"},
        {"field": "ACK number", "protocol_phase": "data transfer"},
        ...
      ],
      "correctAnswerLogic": "{{field}} is used to {{protocol_phase}}",
      "difficulty": "Medium",
      "questionType": "short-answer"
    },
    ...
  ]
}

Requirements:
- Use {{variableName}} syntax for placeholders
- Ensure at least 10 different variable sets per template
- Difficulty should vary (Easy, Medium, Hard)
- Support both MCQ and short-answer types
- Include reasoning for each answer"
```

**Data Model:**

```javascript
// blueprint_candidates table (already in schema)
{
  id: UUID,
  source_document_id: UUID,
  concept_candidate_id: UUID,
  original_question: TEXT,           // LLM input
  generated_json: JSONB,             // Parsed output
  quality_score: INTEGER (0-100),    // Validation score
  confidence_score: DECIMAL,         // LLM confidence
  status: VARCHAR('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED'),
  created_at: TIMESTAMP
}

// generated_json structure:
{
  "template": "What is {{A}} + {{B}}?",
  "variables": [
    {"A": 10, "B": 20},
    {"A": 50, "B": 75},
    ...
  ],
  "correctAnswerLogic": "{{A + B}}",
  "optionsTemplates": ["{{A+B}}", "{{A-B}}", "{{A*B}}", "{{A/B}}"],
  "correctOptionTemplate": "{{A+B}}",
  "difficulty": "Medium",
  "questionType": "multiple-choice"
}
```

**API Endpoints:**

```
POST   /api/blueprints/generate
       AI-powered blueprint generation
       Request: { 
         prompt: "Generate 20 questions on TCP/IP",
         examId: UUID,
         topK: 10,
         temperature: 0.7,
         count: 20
       }
       Response: { success, candidates: [...], jobId }

GET    /api/blueprints/candidates
       List all blueprint candidates (pending review)
       Response: { success, data: [...] }

POST   /api/blueprints/candidates/:id/approve
       Convert candidate to blueprint
       Response: { success, blueprint_id }

POST   /api/blueprints/candidates/:id/reject
       Reject candidate
       
GET    /api/blueprints/generate/status/:jobId
       Check generation job status (for long-running tasks)
```

**Implementation Notes:**
- Gemini setup already in aiService.js
- Need Qdrant client integration
- Need OpenAI embeddings API integration
- Blueprint candidate validation logic needed

---

### PHASE 5: KNOWLEDGE BASE FREEZE

**Objective:** Lock KB after exam scheduling to prevent tampering

**Workflow:**

```
Faculty Creates Exam (Draft)
    ↓
Adds Blueprints
    ↓
Uploads Documents & Generates Candidates (ACTIVE phase)
    ↓
Faculty clicks "Schedule Exam" → Sets start_time, end_time
    ↓
System Freezes KB (status = FROZEN)
    ↓
No new uploads allowed
No documents can be edited
No new embeddings inserted
    ↓
During Exam Period:
  Students take exam (variant generation uses frozen vectors)
    ↓
Exam Ends (end_time passed)
    ↓
Faculty can ARCHIVE KB (no future access)
```

**Database Changes:**

```sql
ALTER TABLE exams ADD COLUMN IF NOT EXISTS kb_freeze_at TIMESTAMP;
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP;
ALTER TABLE rag_knowledge_bases MODIFY status VARCHAR(50) 
  CHECK (status IN ('ACTIVE', 'FROZEN', 'ARCHIVED'));
```

**API Endpoints:**

```
POST   /api/exams/:examId/freeze-knowledge-base
       Lock KB (called on exam publish)
       Response: { success, frozen_at }

POST   /api/exams/:examId/unfreeze-knowledge-base
       Unlock KB (admin only, with audit log)
       
POST   /api/exams/:examId/archive-knowledge-base
       Archive KB (after exam ends)

GET    /api/knowledge-base/:examId/status
       Check KB freeze status
       Response: { status, frozen_at, archived_at }
```

**Permission Checks:**
- Faculty can freeze own exam's KB
- Admin can unfreeze (with logging)
- Once exam ends, auto-archive after 7 days

---

### PHASE 6: DYNAMIC VARIANT GENERATION

**Objective:** Generate unique questions per student on exam start

**Workflow:**

```
Student clicks "Start Exam"
    ↓
For Each Blueprint Linked to Exam:
  1. Generate Seed (hash of studentId + blueprintId + timestamp)
  2. Create PRNG from seed
  3. Select variable set (weighted random or index-based)
  4. Substitute template variables
  5. Generate question text
  6. Generate options (substitute option templates)
  7. Compute correct answer
  8. Store in attempt_questions (locked)
    ↓
Display Generated Paper to Student
    ↓
Student Cannot Refresh or Re-generate
(Same variant locked for duration of exam)
```

**Key Data Structures:**

```javascript
// variantEngine.js - Enhanced

class VariantGenerator {
  constructor(blueprintId, studentId, seed) {
    this.blueprintId = blueprintId;
    this.studentId = studentId;
    this.seed = seed;
    this.prng = createPRNG(seed);
  }

  selectVariableSet(variables, index) {
    // Given array of variable sets, pick one consistently
    // Using PRNG for reproducibility with same seed
    return variables[index % variables.length];
  }

  generateQuestion(blueprint) {
    // Returns: {questionText, options, correctOption, seed, generatedAt}
    
    const variables = this.selectVariableSet(
      blueprint.variable_sets,
      Math.floor(this.prng() * blueprint.variable_sets.length)
    );
    
    const questionText = this.substitute(
      blueprint.template_text,
      variables
    );
    
    const options = blueprint.options_templates.map(opt =>
      this.substitute(opt, variables)
    );
    
    const correctAnswerText = this.substitute(
      blueprint.correct_option_template,
      variables
    );
    
    const correctOption = options.findIndex(o => o === correctAnswerText);
    
    return {
      questionText,
      options,
      correctOption,
      seed: this.seed,
      generatedAt: new Date(),
      variables  // Store for audit trail
    };
  }

  substitute(template, variables) {
    // Replace {{A}}, {{A+B}}, etc. with actual values
    let result = template;
    const keys = Object.keys(variables).sort((a,b) => b.length - a.length);
    
    for (const key of keys) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, variables[key]);
    }
    
    // Evaluate arithmetic expressions like {{10+20}}
    result = result.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
      return evaluateArithmetic(expr, variables);
    });
    
    return result;
  }
}
```

**Attempt Question Locking:**

```sql
CREATE TABLE attempt_questions (
    id UUID PRIMARY KEY,
    attempt_id UUID REFERENCES exam_attempts(id),
    blueprint_id UUID REFERENCES blueprints(id),
    variant_seed VARCHAR(255) NOT NULL,        -- hash(studentId+blueprintId+timestamp)
    question_text TEXT NOT NULL,               -- Final generated text
    options TEXT[] NOT NULL,                   -- Final options
    correct_option INTEGER NOT NULL,           -- Index of correct option
    correct_answer_text TEXT,                  -- For evaluation
    selected_variables JSONB NOT NULL,        -- Variables used
    question_hash VARCHAR(64),                 -- SHA256 for leak detection
    generated_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Unique constraint: one attempt_questions per attempt per blueprint
ALTER TABLE attempt_questions 
ADD UNIQUE (attempt_id, blueprint_id);
```

**API Endpoints:**

```
POST   /api/exams/:examId/start
       Start exam, generate all variants
       Request: {}
       Response: { 
         success, 
         attemptId,
         exam: {title, duration, ...},
         questions: [{id, question_text, options}, ...]
       }

GET    /api/attempts/:attemptId/questions
       Retrieve locked questions (student's exam paper)
       Response: { success, questions: [...] }

GET    /api/attempts/:attemptId/question/:questionId
       Get single question details (for display during exam)
       Response: { success, question: {...} }
```

**Implementation Notes:**
- variantEngine.js largely implemented (PRNG works)
- Need to integrate with exam start flow
- Need to store variables for traceability
- Need attempt locking logic in controller

---

### PHASE 7: ATTEMPT LOCKING

**Objective:** Ensure students always see the same generated paper (no refresh re-generation)

**Workflow:**

```
Student Starts Exam (POST /start)
    ↓
Backend generates seed: SHA256(studentId + blueprintId + timestamp)
    ↓
Generate variants using PRNG(seed)
    ↓
Store in attempt_questions with seed and variant details
    ↓
Student submits answers (POST /submit)
    ↓
Backend retrieves from attempt_questions (not re-generating)
    ↓
Evaluation uses stored correct_option (not blueprint's template)
    ↓ 
Lock Persist: Once written, attempt_questions never updated
```

**Seed Generation Strategy:**

```javascript
// In examController.startExam()

async function generateSeed(studentId, blueprintId) {
  // Deterministic: same input → same seed
  // Method: SHA256 hash
  
  const crypto = require('crypto');
  const input = `${studentId}:${blueprintId}:${examId}:v1`;
  const seed = crypto.createHash('sha256').update(input).digest('hex');
  return seed;
}
```

**Immutability Contract:**

```sql
-- Enforce: attempt_questions cannot be updated after creation
CREATE TRIGGER attempt_questions_immutable 
BEFORE UPDATE ON attempt_questions
FOR EACH ROW
EXECUTE FUNCTION raise_immutability();

CREATE FUNCTION raise_immutability() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'attempt_questions records are immutable';
END;
$$ LANGUAGE plpgsql;
```

**API Enforcement:**

```javascript
// examController.getExamQuestions() - No re-generation allowed

async function getExamQuestions(req, res) {
  const { examId } = req.params;
  const studentUid = req.user.uid;
  
  // Find active attempt
  const attemptRes = await db.query(
    "SELECT id FROM exam_attempts WHERE exam_id=$1 AND student_uid=$2 AND status='in_progress' LIMIT 1",
    [examId, studentUid]
  );
  
  if (attemptRes.rows.length === 0) {
    return res.status(404).json({ success: false, error: "Active attempt not found" });
  }
  
  const attemptId = attemptRes.rows[0].id;
  
  // Retrieve from attempt_questions (locked, no re-generation)
  const questionsRes = await db.query(
    "SELECT id, question_text, options FROM attempt_questions WHERE attempt_id=$1 ORDER BY created_at",
    [attemptId]
  );
  
  return res.json({ success: true, questions: questionsRes.rows });
}
```

---

### PHASE 8: LEAK TRACEABILITY

**Objective:** Generate SHA256 fingerprints for each question to detect paper leaks

**Workflow:**

```
Generate Question Variant
    ↓
Compute SHA256(question_text + options + seed)
    ↓
Store hash in attempt_questions & audit_log
    ↓
If Paper Leaks (Posted Online):
  1. Identify fingerprint from leaked paper
  2. Query audit_log by hash
  3. Find student_id, attempt_id, timestamp
  4. Match with suspected student
  5. Generate incident report
```

**Data Model:**

```sql
CREATE TABLE question_audit_log (
    id UUID PRIMARY KEY,
    question_id UUID REFERENCES attempt_questions(id),
    blueprint_id UUID REFERENCES blueprints(id),
    student_id VARCHAR(255),
    attempt_id UUID,
    exam_id UUID,
    question_hash VARCHAR(64) NOT NULL,  -- SHA256
    options_hash VARCHAR(64),
    seed VARCHAR(255),
    generated_at TIMESTAMP,
    fingerprint_metadata JSONB,          -- Difficulty, topic, etc.
    created_at TIMESTAMP,
    
    INDEX idx_question_hash (question_hash),  -- For fast lookup on leak detection
    INDEX idx_student_id (student_id)
);

-- Leak investigation table
CREATE TABLE leak_investigations (
    id UUID PRIMARY KEY,
    reported_at TIMESTAMP,
    reported_by VARCHAR(255),
    source_url VARCHAR(1000),
    leaked_question_hashes TEXT[],
    matched_students TEXT[],
    incident_severity VARCHAR(50),      -- LOW, MEDIUM, HIGH, CRITICAL
    investigation_status VARCHAR(50),   -- OPEN, IN_PROGRESS, RESOLVED
    actions_taken TEXT,
    created_at TIMESTAMP,
    resolved_at TIMESTAMP
);
```

**Fingerprint Generation:**

```javascript
// In variantEngine.generateQuestion()

async function generateQuestionWithFingerprint(blueprint, variables) {
  const questionText = substitute(blueprint.template_text, variables);
  const options = blueprint.options_templates.map(opt => substitute(opt, variables));
  
  // Generate SHA256 fingerprint
  const crypto = require('crypto');
  const fingerprintInput = JSON.stringify({
    questionText,
    options,
    seed,
    timestamp: new Date().toISOString()
  });
  
  const questionHash = crypto
    .createHash('sha256')
    .update(fingerprintInput)
    .digest('hex');
  
  return {
    questionText,
    options,
    correctOption,
    questionHash,
    seed
  };
}
```

**API Endpoints:**

```
POST   /api/leak/report
       Report suspected paper leak (admin/faculty)
       Request: {
         sourceUrl,
         leakedQuestionTexts: [text1, text2, ...]
       }
       Response: { success, investigationId }

POST   /api/leak/investigate/:investigationId
       Compute hashes, match leaked questions to students
       Response: { 
         success,
         matchedStudents: [
           {studentId, examId, attemptId, matchConfidence: 0.95}
         ],
         severity: CRITICAL
       }

GET    /api/leak/reports
       List all investigations (admin only)

POST   /api/leak/incident/:studentId/action
       Log disciplinary action
       Request: { action, notes }
```

**Leak Detection Algorithm:**

```javascript
async function investigateLeak(investigationId) {
  const investigation = await db.query(
    "SELECT leaked_question_hashes FROM leak_investigations WHERE id=$1",
    [investigationId]
  );
  
  const leakedHashes = investigation.rows[0].leaked_question_hashes;
  
  // For each leaked hash, find potential matches
  const suspects = [];
  
  for (const leakedHash of leakedHashes) {
    const matches = await db.query(
      `SELECT DISTINCT student_id, attempt_id, exam_id, COUNT(*) as match_count
       FROM question_audit_log
       WHERE question_hash SIMILAR TO $1
       GROUP BY student_id, attempt_id, exam_id`,
      [leakedHash]
    );
    
    if (matches.rows.length > 0) {
      suspects.push(...matches.rows);
    }
  }
  
  // Aggregate: which student appears most frequently?
  const suspectRanking = {};
  for (const suspect of suspects) {
    suspectRanking[suspect.student_id] = 
      (suspectRanking[suspect.student_id] || 0) + suspect.match_count;
  }
  
  const topSuspects = Object.entries(suspectRanking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({studentId: id, matchCount: count}));
  
  return topSuspects;
}
```

---

### PHASE 9: EVENT-DRIVEN ARCHITECTURE

**Objective:** Use Redis Pub/Sub for event broadcasting and asynchronous processing

**Events to Emit:**

```
ExamScheduled:        { examId, startTime, endTime, blueprintCount }
ExamStarted:          { examId, studentId, attemptId }
QuestionGenerated:    { attemptId, blueprintId, questionHash }
SubmissionReceived:   { attemptId, studentId, timestamp }
EvaluationCompleted:  { attemptId, score, passed }
SuspiciousActivity:   { attemptId, studentId, activity, timestamp }
KnowledgeBaseFrozen:  { examId, frozenAt }
LeakDetected:         { investigationId, severity, matchedCount }
```

**Redis Setup:**

```javascript
// services/eventBus.js

const redis = require('redis');

class EventBus {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.connect();
  }

  async publish(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date(),
      id: crypto.randomUUID()
    };
    
    console.log(`[EVENT] ${eventType}:`, event);
    await this.client.publish(
      `secureexam:${eventType.toLowerCase()}`,
      JSON.stringify(event)
    );
  }

  async subscribe(eventType, handler) {
    const channel = `secureexam:${eventType.toLowerCase()}`;
    
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, (message) => {
      const event = JSON.parse(message);
      handler(event);
    });
  }
}

module.exports = new EventBus();
```

**Event Subscribers (Async Processors):**

```javascript
// listeners/examStartedListener.js
eventBus.subscribe('ExamStarted', async (event) => {
  const { examId, studentId, attemptId } = event.payload;
  
  // Log to audit_log
  // Trigger email notification
  // Start inactivity timer
});

// listeners/submissionReceivedListener.js
eventBus.subscribe('SubmissionReceived', async (event) => {
  const { attemptId } = event.payload;
  
  // Queue for async grading
  // Send confirmation email
  // Trigger evaluation engine
});

// listeners/leakDetectedListener.js
eventBus.subscribe('LeakDetected', async (event) => {
  const { investigationId, severity } = event.payload;
  
  if (severity === 'CRITICAL') {
    // Alert admins immediately
    // Disable suspected student's access
    // Generate incident report
  }
});
```

**Integration in Controllers:**

```javascript
// examController.startExam()
await eventBus.publish('ExamStarted', {
  examId,
  studentId,
  attemptId,
  timestamp: new Date()
});

// examController.submitExam()
await eventBus.publish('SubmissionReceived', {
  attemptId,
  studentId,
  timestamp: new Date()
});
```

---

### PHASE 10: SECURITY & RBAC

**Core Principle:** Zero-Trust Model
```
- Faculty CANNOT view student-generated questions
- Students CANNOT access blueprint data or templates
- Admin CANNOT modify questions after exam starts (FROZEN state)
- All access is logged and auditable
```

**Role-Based Access Control (RBAC):**

```javascript
// middleware/rbacMiddleware.js

const permissions = {
  STUDENT: {
    'exams:list': 'View published exams',
    'exams:start': 'Start exam attempt',
    'exams:submit': 'Submit answers',
    'attempts:view': 'View own attempt',
    'certificates:view': 'View own certificates'
  },
  
  FACULTY: {
    'exams:create': 'Create exams',
    'exams:edit': 'Edit exam (draft only)',
    'exams:publish': 'Publish exam',
    'blueprints:create': 'Create blueprints',
    'blueprints:manage': 'CRUD blueprints',
    'documents:upload': 'Upload RAG documents',
    'documents:process': 'Process documents',
    'blueprints:generate': 'Generate with AI',
    'analytics:view': 'View exam analytics (own exams)',
    'attempts:grade': 'Grade attempts (own exams)',
    'exams:list': 'View own exams'
  },
  
  ADMIN: {
    'system:*': 'Full system access',
    'users:manage': 'Manage users',
    'exams:*': 'Manage all exams',
    'blueprints:*': 'Manage all blueprints',
    'analytics:*': 'View all analytics',
    'leak:investigate': 'Investigate leaks',
    'kb:freeze': 'Freeze knowledge bases',
    'audit:view': 'View audit logs',
    'incidents:manage': 'Manage incidents'
  }
};

async function checkPermission(req, requiredPermission) {
  const userRole = req.user.role; // From JWT
  const rolePerms = permissions[userRole] || {};
  
  if (requiredPermission === 'system:*' && userRole === 'ADMIN') {
    return true;
  }
  
  return Object.keys(rolePerms).some(perm => 
    perm === requiredPermission || 
    perm === `${requiredPermission.split(':')[0]}:*`
  );
}
```

**Key Security Measures:**

```javascript
// 1. JWT Token Blacklisting (on logout)
const tokenBlacklist = new Set();

function blacklistToken(token) {
  tokenBlacklist.add(token);
  // Expire from Set after TTL
  setTimeout(() => tokenBlacklist.delete(token), 24 * 60 * 60 * 1000);
}

// 2. Rate Limiting
const rateLimit = require('express-rate-limit');

const examSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 1,                   // Max 1 submission per minute (prevent rapid resubmit)
  message: 'Too many submissions'
});

app.post('/api/exams/:id/submit', examSubmitLimiter, submitExam);

// 3. Input Validation
const joi = require('joi');
const blueprintSchema = joi.object({
  title: joi.string().required(),
  templateText: joi.string().min(10).required(),
  variableSets: joi.array().min(1).required(),
  correctOptionTemplate: joi.string().required()
});

// 4. Secure Logging (no passwords, no sensitive data)
function logAction(action, userId, resource, result) {
  const log = {
    timestamp: new Date(),
    action,
    userId,
    resource,
    result,
    // Never log: passwords, tokens, PII
  };
  console.log(JSON.stringify(log));
}

// 5. SQL Injection Prevention (using parameterized queries - already in place)
// ✅ Already using: db.query(sql, [params])

// 6. XSS Prevention (frontend + backend)
// - Sanitize all user input before storing
// - Escape HTML in templates
const xss = require('xss');
const cleanText = xss(userInput);
```

**Audit Logging:**

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP,
    user_id VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100),           -- 'CREATE_BLUEPRINT', 'START_EXAM', 'VIEW_QUESTION'
    resource_type VARCHAR(50),     -- 'BLUEPRINT', 'EXAM', 'ATTEMPT'
    resource_id UUID,
    status VARCHAR(20),            -- 'SUCCESS', 'DENIED', 'ERROR'
    reason TEXT,                   -- Why denied (e.g., "INSUFFICIENT_PERMISSIONS")
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP
);

-- Log every sensitive action:
INSERT INTO audit_log (user_id, action, resource_type, resource_id, status)
VALUES (userId, 'VIEW_QUESTION', 'ATTEMPT', questionId, 'SUCCESS');
```

---

### PHASE 11: DATABASE MIGRATION

**Strategy:** Keep both old and new systems running in parallel

**Existing Tables (Unchanged):**
```
users, exams, exam_attempts, questions
```

**New Tables (Added):**
```
blueprints, exam_blueprints, attempt_questions,
uploaded_documents, topics, concept_candidates, blueprint_candidates,
vector_chunks, rag_knowledge_bases,
question_audit_log, leak_investigations,
audit_log, system_settings
```

**Migration Flow:**

```sql
-- Step 1: Backup existing data
BEGIN TRANSACTION;

-- Step 2: Create new tables
CREATE TABLE blueprints (...);
CREATE TABLE exam_blueprints (...);
... (see full schema below)

-- Step 3: Optional - Convert old questions to blueprint candidates
INSERT INTO blueprint_candidates (original_question, generated_json, status)
SELECT 
  question_text,
  json_build_object(
    'template', question_text,
    'variables', json_build_array(),
    'correctAnswerLogic', 'Legacy question'
  ),
  'PENDING_REVIEW'
FROM questions;

-- Step 4: Validate migration
SELECT COUNT(*) FROM questions;
SELECT COUNT(*) FROM blueprint_candidates;

-- Step 5: Commit
COMMIT;
```

**Coexistence:**

```
Exams created BEFORE migration:
  → Use old questions table (exam.questions_mode = 'LEGACY')
  → Can still be taken by students
  → No variant generation

Exams created AFTER migration:
  → Use new blueprints (exam.questions_mode = 'BLUEPRINT')
  → Enable variant generation
  → Require blueprint setup
```

---

### PHASE 12: BLOCKCHAIN INTEGRATION

**Objective:** Store variant fingerprints and credentials immutably

**Smart Contract Enhancement:**

```solidity
// contracts/CredentialRegistry.sol (Enhanced)

mapping(bytes32 => QuestionFingerprint) public questionFingerprints;
mapping(address => CertificateWithVariance) public certificates;

struct QuestionFingerprint {
    string examId;
    string studentId;
    bytes32 questionHash;
    uint256 timestamp;
    string topic;
    string difficulty;
}

struct CertificateWithVariance {
    string name;
    string examName;
    uint256 score;
    uint256 completionDate;
    string[] uniqueQuestionHashes;   // Prove uniqueness
    bytes32 certificateHash;
}

function recordQuestionFingerprint(
    string memory examId,
    string memory studentId,
    bytes32 questionHash,
    string memory topic
) public onlyAuthorized {
    questionFingerprints[questionHash] = QuestionFingerprint({
        examId: examId,
        studentId: studentId,
        questionHash: questionHash,
        timestamp: block.timestamp,
        topic: topic,
        difficulty: difficulty
    });
}

function issueCertificateWithVariance(
    address studentAddress,
    string memory studentName,
    string memory examName,
    uint256 score,
    bytes32[] memory questionHashes
) public onlyAuthorized {
    certificates[studentAddress] = CertificateWithVariance({
        name: studentName,
        examName: examName,
        score: score,
        completionDate: block.timestamp,
        uniqueQuestionHashes: questionHashes,
        certificateHash: keccak256(abi.encodePacked(studentName, examName, score))
    });
}
```

**API for Blockchain:**

```
POST   /api/blockchain/record-fingerprint
       Record question fingerprint on-chain
       Request: { examId, studentId, questionHash, topic, difficulty }
       Response: { success, transactionHash }

POST   /api/blockchain/issue-certificate
       Issue certificate with variance proof
       Request: { studentAddress, studentName, examName, score, questionHashes }
       Response: { success, certificateUrl }

GET    /api/blockchain/verify/:certificateHash
       Public verification endpoint for credentials
       Response: { valid, data: {...} }
```

---

## DATABASE SCHEMA

### Complete ER Diagram

```
┌─────────────┐
│   users     │─────────────────┐
├─────────────┤                 │
│ firebase_uid│                 │
│ email       │                 │
│ role        │                 │
│ name        │                 │
└─────────────┘                 │
                                │
                    ┌───────────▼──────────┐
                    │      exams           │
                    ├──────────────────────┤
                    │ id (UUID)            │
                    │ title                │
                    │ description          │
                    │ created_by (FK users)│
                    │ status               │◄──────────────┐
                    │ duration_minutes     │               │
                    │ passing_percentage   │               │
                    │ negative_marking     │               │
                    │ start_time           │               │
                    │ end_time             │               │
                    │ created_at           │               │
                    │ kb_freeze_at (NEW)   │               │
                    └──────────┬───────────┘               │
                               │                           │
                ┌──────────────┼──────────────┐            │
                │              │              │            │
         ┌──────▼─────┐   ┌──────▼────┐  ┌────▼──────┐   │
         │  questions │   │blueprints │  │exam_      │   │
         ├────────────┤   ├───────────┤  │blueprints │   │
         │ exam_id(FK)│   │ id (UUID) │  ├───────────┤   │
         │ question.. │   │ title     │  │exam_id(FK)│   │
         │ options[]  │   │ topic     │  │blueprint_ │   │
         │ correct..  │   │ difficulty│  │id(FK)     │   │
         └────────────┘   │ learning..│  │ position  │   │
                          │ template..│  └───────────┘   │
                          │ options..│                    │
                          │ correct..│                    │
                          │ variables│                    │
                          │ created_ │                    │
                          │ by(FK)   │                    │
                          └──────────┘                    │
                                                          │
                    ┌─────────────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │  exam_attempts      │
         ├─────────────────────┤
         │ id (UUID)           │
         │ exam_id (FK)        │
         │ student_uid         │
         │ score               │
         │ passed              │
         │ submitted_at        │
         │ violations_count    │
         │ status              │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────────┐
         │  attempt_questions (NEW)│
         ├──────────────────────────┤
         │ id (UUID)                │
         │ attempt_id (FK)          │
         │ blueprint_id (FK)        │
         │ variant_seed             │
         │ question_text            │
         │ options[]                │
         │ correct_option           │
         │ question_hash (SHA256)   │
         │ selected_variables       │
         │ generated_at             │
         └──────────────────────────┘


RAG SYSTEM TABLES:

┌─────────────────────┐
│uploaded_documents   │◄────┐
├─────────────────────┤     │
│ id (UUID)           │     │
│ file_name           │     │
│ uploaded_by         │     │
│ processing_status   │     │
│ parsed_json         │     │
│ kb_status (NEW)     │     │
└───────┬─────────────┘     │
        │                   │
        ├──────┬────────┬───┤
        │      │        │   │
   ┌────▼──┐  ┌▼──────┐ │  ┌▼──────────────┐
   │topics │  │concept│ │  │ rag_knowledge │
   │       │  │_cand. │ │  │ _bases (NEW)  │
   │       │  │       │ │  ├───────────────┤
   │       │  └───────┘ │  │ exam_id (FK)  │
   └───────┘            │  │ status        │
                        │  │ frozen_at     │
              ┌─────────┘  │ archived_at   │
              │            └───────────────┘
        ┌─────▼────────┐
        │blueprint_    │
        │candidates    │
        └──────────────┘


AUDIT & SECURITY TABLES:

┌──────────────────────┐
│ question_audit_log   │
├──────────────────────┤
│ id (UUID)            │
│ question_id (FK)     │
│ blueprint_id (FK)    │
│ student_id           │
│ attempt_id (FK)      │
│ exam_id (FK)         │
│ question_hash        │ ◄─── Fingerprint for leak detection
│ seed                 │
│ generated_at         │
└──────────────────────┘

┌──────────────────────┐
│ leak_investigations  │
├──────────────────────┤
│ id (UUID)            │
│ reported_at          │
│ leaked_questions[]   │
│ matched_students[]   │
│ severity             │
│ status               │
└──────────────────────┘

┌──────────────────────┐
│ audit_log            │
├──────────────────────┤
│ id (UUID)            │
│ timestamp            │
│ user_id              │
│ action               │
│ resource_type        │
│ resource_id          │
│ status               │
└──────────────────────┘
```

### Full SQL Schema (Ready to Deploy)

See [SECUREEXAM_AI_SQL_SCHEMA.sql](./SECUREEXAM_AI_SQL_SCHEMA.sql)

---

## API SPECIFICATIONS

### Authentication Endpoints

```
POST /api/auth/register
  Create user account
  - Requires Firebase ID token
  - Input: {name, role: "student"|"faculty"}
  - Output: {success, data: {firebase_uid, email, role, name}}
  - Status: ✅ Implemented

POST /api/auth/login
  Verify user login
  - Requires Firebase ID token
  - Output: {success, data: {firebase_uid, email, role, name}}
  - Status: ✅ Implemented

GET /api/auth/me
  Get current user
  - Output: {firebaseUid, email, name, role}
  - Status: ✅ Implemented
```

### Exam Management Endpoints

```
POST /api/exams
  Create new exam (draft)
  - Requires: Faculty role
  - Input: {title, description, passingPercentage, durationMinutes, ...}
  - Status: ✅ Implemented

POST /api/exams/:examId/blueprints
  Attach blueprints to exam
  - Requires: Faculty role (auth), exam owner OR Admin
  - Input: {blueprintIds: [UUID, UUID, ...]}
  - Status: ⚠️  Needs implementation

GET /api/exams/:examId/blueprints
  Get blueprints for exam
  - Status: ⚠️  Needs implementation

POST /api/exams/:examId/status
  Update exam status (draft → published → closed)
  - Status: ✅ Partially implemented

POST /api/exams/:examId/freeze-knowledge-base
  Freeze RAG knowledge base (called on publish)
  - Requires: Faculty (auth), Admin
  - Status: ⚠️  Needs implementation

GET /api/exams/:examId
  Get exam details
  - Status: ✅ Implemented

GET /api/exams
  List exams (students see published, faculty see all)
  - Status: ✅ Implemented
```

### Blueprint Endpoints

```
POST /api/blueprints
  Create blueprint
  - Requires: Faculty role
  - Input: {title,topic, difficulty, templateText, optionsTemplates, correctOptionTemplate, variableSets}
  - Status: ✅ Implemented

GET /api/blueprints
  List all blueprints
  - Status: ✅ Implemented

GET /api/blueprints/:id
  Get blueprint details
  - Status: ✅ Implemented

PUT /api/blueprints/:id
  Update blueprint
  - Requires: Faculty (creator) OR Admin
  - Status: ✅ Implemented

DELETE /api/blueprints/:id
  Deprecate blueprint (soft delete)
  - Status: ⚠️  Needs implementation
```

### Blueprint Generation (Phase 4)

```
POST /api/blueprints/generate
  AI-powered blueprint generation from RAG
  - Requires: Faculty role
  - Input: {prompt, examId, topK: 10, temperature: 0.7, count: 20}
  - Output: {success, candidates: [...], jobId}
  - Status: ⚠️  Needs implementation

GET /api/blueprints/candidates
  List pending blueprint candidates
  - Requires: Faculty role
  - Status: ⚠️  Needs implementation

POST /api/blueprints/candidates/:id/approve
  Convert candidate to blueprint
  - Status: ⚠️  Needs implementation

POST /api/blueprints/candidates/:id/reject
  Reject candidate
  - Status: ⚠️  Needs implementation
```

### RAG Knowledge Base Endpoints

```
POST /api/knowledge-base/upload
  Upload document (PDF, DOCX, PPTX, TXT)
  - Requires: Faculty role
  - Input: {file (multipart), examId}
  - Output: {success, data: {id, file_name, ...}}
  - Status: ✅ Implemented

POST /api/knowledge-base/process/:documentId
  Parse and embed document
  - Requires: Faculty role
  - Status: ⚠️  Needs Qdrant integration

GET /api/knowledge-base/:examId/status
  Check KB freeze status
  - Status: ⚠️  Needs implementation

POST /api/knowledge-base/freeze/:examId
  Freeze KB (after exam publish)
  - Status: ⚠️  Needs implementation

DELETE /api/knowledge-base/:documentId
  Delete document (only if KB ACTIVE)
  - Status: ⚠️  Needs implementation
```

### Exam Attempt Endpoints

```
POST /api/exams/:examId/start
  Start exam, generate question variants
  - Requires: Student role, exam published, not started yet
  - Input: {}
  - Output: { success, attemptId, exam: {...}, questions: [...] }
  - Status: ⚠️  Needs variant generation integration

GET /api/attempts/:attemptId/questions
  Get student's locked questions
  - Requires: Student (attempting OR completed exam)
  - Output: { success, questions: [{id, question_text, options}, ...] }
  - Status: ⚠️  Needs implementation

GET /api/attempts/:attemptId/question/:questionId
  Get single question
  - Status: ⚠️  Needs implementation

POST /api/exams/:examId/submit
  Submit exam (all answers)
  - Requires: Student, active attempt
  - Input: {attemptId, answers: {questionId: selectedOption}}
  - Output: { success, score, passed, certificateUrl }
  - Status: ⚠️  Needs implementation

GET /api/attempts/:attemptId
  Get attempt details (graded)
  - Requires: Student (own OR Faculty/Admin (any)
  - Status: ⚠️  Needs implementation
```

### Leak Detection Endpoints

```
POST /api/leak/report
  Report suspected paper leak
  - Requires: Admin role
  - Input: {sourceUrl, leakedQuestionTexts: []}
  - Status: ⚠️  Needs implementation

POST /api/leak/investigate/:investigationId
  Analyze leak, match to students
  - Requires: Admin role
  - Status: ⚠️  Needs implementation

GET /api/leak/reports
  List leak investigations
  - Requires: Admin role
  - Status: ⚠️  Needs implementation

POST /api/leak/incident/:studentId/action
  Log disciplinary action
  - Requires: Admin role
  - Status: ⚠️  Needs implementation
```

### Analytics & Admin Endpoints

```
GET /api/admin/analytics/dashboard
  System analytics
  - Requires: Admin role
  - Status: ⚠️  Needs implementation

GET /api/admin/audit-log
  View audit log
  - Requires: Admin role
  - Status: ⚠️  Needs implementation

GET /api/admin/users
  List users
  - Requires: Admin role
  - Status: ⚠️  Needs implementation

POST /api/admin/settings
  Update system settings
  - Requires: Admin role
  - Status: ⚠️  Needs implementation
```

---

## DEVELOPMENT ROADMAP

### Week 1: Core Variant Generation System

**Days 1-2: Blueprint Integration**
- [ ] Link exams to blueprints (exam_blueprints table)
- [ ] Update examController to handle blueprint mode
- [ ] Create UI selector for blueprint attachment
- [ ] Add blueprint preview in FacultyDashboard
- Estimated: 8-10 hours

**Days 2-3: Variant Generation & Attempt Locking  **
- [ ] Integrate VariantGenerator into exam start flow
- [ ] Implement deterministic seeding (SHA256)
- [ ] Lock attempt_questions records (immutable)
- [ ] Build question retrieval endpoint (no re-generation)
- [ ] Test variant consistency
- Estimated: 10-12 hours

**Day 4: Core Testing**
- [ ] Unit tests: VariantGenerator, arithmetic evaluation
- [ ] Integration tests: Exam start → variant generation → submission
- [ ] Test data consistency across page refreshes
- Estimated: 6-8 hours

**Deliverables:** Working prototype where students get unique questions per attempt

---

### Week 2: RAG & Leak Traceability

**Days 5-6: Qdrant Integration**
- [ ] Setup Qdrant (local or managed)
- [ ] Implement DocumentService (upload, parse, chunk)
- [ ] Integrate OpenAI embeddings API
- [ ] Build VectorService (search, store, retrieve)
- [ ] Test RAG pipeline end-to-end
- Estimated: 12-14 hours

**Days 6-7: Blueprint Generation**
- [ ] Complete Gemini LLM integration
- [ ] Implement blueprintGenerationService
- [ ] Create blueprint_candidates workflow
- [ ] Build UI for blueprint generator interface
- [ ] Faculty review & approval flow
- Estimated: 10-12 hours

**Day 8: Leak Traceability**
- [ ] Implement SHA256 fingerprinting
- [ ] Build question_audit_log system
- [ ] Create leak investigation workflow
- [ ] Build leak detection algorithm
- Estimated: 8-10 hours

**Deliverables:** Full RAG pipeline, blueprint generation, leak detection system

---

### Week Later: Security & Polish

**Phase 10-12 Implementation:**
- [ ] Redis Pub/Sub event bus
- [ ] Complete RBAC & access controls
- [ ] Audit logging system
- [ ] Blockchain integration
- [ ] Knowledge base freeze
- [ ] Complete test coverage
- Estimated: 15-20 hours (staggered)

**Estimated Total:** 70-90 hours (~2 weeks fulltime)

---

## TECHNOLOGY STACK

### Backend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Framework | Express.js | 4.19 | API framework |
| Database | PostgreSQL | 15+ | Primary data store |
| Database Hosting | Neon | - | Managed Postgres |
| Vector DB | Qdrant | Latest | RAG vector storage |
| Cache/Pub-Sub | Redis | 6+ | Event bus, caching |
| Auth | Firebase Admin | 14+ | Authentication |
| LLM | Google Gemini | 2.5 Flash | Blueprint generation |
| Embeddings | OpenAI | Text Embedding 3 | Vector generation |
| File Upload | Multer | 2.1 | Document upload |
| PDF Parse | pdf-parse | 2.4 | Document extraction |

### Frontend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18+ | Build environment |
| Framework | React | 19.2 | UI framework |
| Router | React Router | 7.17 | Navigation |
| Styling | TailwindCSS | 3.4 | CSS framework |
| HTTP Client | Axios | 1.17 | API calls |
| Auth | Firebase | 12.14 | Authentication |
| Icons | Lucide React | 1.17 | UI icons |
| Bundler | Vite | 8+ | Build tool |

### Infrastructure & DevOps
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | Neon PostgreSQL | Managed postgres on AWS/GCP |
| Vector Store | Qdrant | Self-hosted or managed |
| Storage | S3 (if needed) | Document/file storage |
| Cache | Redis (Upstash) | Event bus, session cache |
| LLM | Google Gemini API | AI capabilities |
| Blockchain | Polygon Amoy | Credential verification |
| Auth | Firebase | User management |

### Development Tools
```
Package Manager: npm / yarn
Version Control: Git
API Testing: Postman, Insomnia
Documentation: Markdown, Swagger/OpenAPI
Logging: Winston / Console
Monitoring: TBD (DataDog, New Relic, etc.)
Testing: Jest, Mocha, Chai
```

---

## NEXT STEPS

1. **Review this document** with stakeholders
2. **Setup infrastructure:**
   - [ ] Qdrant instance (Docker or managed)
   - [ ] Redis instance
   - [ ] OpenAI API key
   - [ ] Google Gemini API key
3. **Phase 2 Implementation:** Start with blueprint linking
4. **Phase 6 Implementation:** Variant generation
5. **Incremental rollout** to production

---

## APPENDIX

### File: SECUREEXAM_AI_SQL_SCHEMA.sql

See separate file with complete SQL migration scripts.

### File: SECUREEXAM_AI_API_COLLECTION.postman_json

Postman API collection for all endpoints (see separate file).

### File: SECUREEXAM_AI_ARCHITECTURE_DIAGRAM.drawio

Draw.io architecture diagram (see separate file).

---

**Document Version:** 1.0  
**Last Updated:** June 14, 2026  
**Status:** Ready for Implementation

