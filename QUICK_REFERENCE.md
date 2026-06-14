# SecureExam AI - Quick Reference Guide
## Complete System Overview & Getting Started

**Version:** 1.0  
**Date:** June 14, 2026  
**Status:** READY FOR IMPLEMENTATION

---

## 🎯 PROJECT OVERVIEW

### What is SecureExam AI?
A **zero-trust dynamic examination platform** that generates unique question papers for each student using **reusable blueprints**, eliminating paper leaks and insider threats.

### Key Innovation
```
Traditional System          →    SecureExam AI
───────────────────────          ──────────────
Same questions for all     →     Unique variants per student
Faculty can view questions →     Blueprint templates only
No variant tracking        →     SHA256 fingerprint tracing
No audit trail             →     Complete event audit
```

---

## 📊 PROJECT STRUCTURE

### Deliverables Created (This Sprint)

| File | Purpose | Size |
|------|---------|------|
| `SECUREEXAM_AI_SYSTEM_DESIGN.md` | Complete architecture & phases | 80+ KB |
| `SECUREEXAM_AI_SQL_SCHEMA.sql` | Database schema & migrations | 30+ KB |
| `IMPLEMENTATION_GUIDE.md` | Code examples & tech details | 60+ KB |
| `DEVELOPMENT_CHECKLIST.md` | Task breakdown & timeline | 40+ KB |
| `QUICK_REFERENCE.md` | This file | 20+ KB |

**Total Documentation:** ~200+ KB of comprehensive guides

---

## 🚀 GETTING STARTED (5 MINUTES)

### 1. Clone & Setup
```bash
cd d:/Examination-portal
git checkout -b secureexam-ai-dev
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install
npm install redis qdrant-js

# Frontend
cd ../frontend
npm install
```

### 3. Environment Setup
```bash
# Create backend/.env
cp backend/.env.example backend/.env
# Edit with your API keys (see DEVELOPMENT_CHECKLIST.md)

# Create frontend/.env.local
cp frontend/.env.example frontend/.env.local
```

### 4. Database Setup
```bash
# Run migrations
psql $DATABASE_URL < SECUREEXAM_AI_SQL_SCHEMA.sql

# Verify
psql $DATABASE_URL -c "SELECT count(*) FROM blueprints;"
```

### 5. Start Services
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# Terminal 4: Redis (Docker)
docker run -p 6379:6379 redis:alpine
```

**Now access:** http://localhost:5173 (Frontend)

---

## 📋 CORE CONCEPTS

### 1. Blueprints (Templates)
**What:** Reusable question templates with variables  
**Why:** Generate unique variations for each student  
**Example:**
```json
{
  "template": "What is {{A}} + {{B}}?",
  "options": ["{{A+B}}", "{{A-B}}", "{{A*B}}"],
  "variableSets": [
    {"A": 10, "B": 20},
    {"A": 50, "B": 75},
    {"A": 100, "B": 200}
  ]
}
```

### 2. Variant Generation
**What:** Converting blueprint + seed → unique question  
**How:** Deterministic PRNG ensures reproducibility  
**When:** When student clicks "Start Exam"

### 3. Attempt Locking
**What:** Questions locked immediately after generation  
**Why:** Prevent page refresh from changing questions  
**How:** Immutable `attempt_questions` table + trigger

### 4. Leak Traceability
**What:** SHA256 fingerprint of every generated question  
**Why:** Detect which student leaked the paper  
**How:** Match leaked question hash to attempt_questions table

### 5. RAG Integration
**What:** Upload documents → extract concepts → generate blueprints  
**Tech:** Qdrant (vectors) + OpenAI (embeddings) + Gemini (LLM)

---

## 🏗️ ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                      SECUREEXAM AI                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FACULTY          STUDENT                ADMIN               │
│  ┌──────┐         ┌─────────┐           ┌────────┐          │
│  │Create│         │ Start   │           │Monitor │          │
│  │      │         │ Exam    │           │ Leaks  │          │
│  │Exams │         │ ┌─────┐ │           │        │          │
│  │      │→────────→ │Variant││────────→ │Watch   │          │
│  │Attach│  Generate │Engine │           │Audit   │          │
│  │      │         │ └─────┘ │           │        │          │
│  │Blue  │         │         │           │        │          │
│  │Print │         │ Submit  │           │        │          │
│  │Upload│         │ Answers │           │        │          │
│  │      │         │         │           │        │          │
│  │Docs  │         └─────────┘           └────────┘          │
│  └──────┘                                                    │
│    │                   │                  │                 │
│    │                   │                  │                 │
│    ▼                   ▼                  ▼                 │
│  RAG KB           Variant Store      Leak Database         │
│  ┌─────┐         ┌───────────┐       ┌──────────┐         │
│  │Docs │         │Attempt    │       │Audit Log │         │
│  │      │         │Questions  │       │          │         │
│  │Chunks│         │(Locked)   │       │Question  │         │
│  │      │         │           │       │Hashes    │         │
│  └─────┘         └───────────┘       │          │         │
│    │                   │             │Blockchain│         │
│    │                   │             └──────────┘         │
│    ▼                   ▼                  ▼               │
│  ┌───────────────────────────────────────────┐           │
│  │  PostgreSQL (Neon) + Qdrant + Redis       │           │
│  └───────────────────────────────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 WORKFLOW FLOW

### Faculty: Create & Publish Exam

```
1. Login (Firebase)
   ↓
2. Create Exam (Draft)
   ├─ Title, duration, passing %, etc.
   ↓
3. Upload Documents (Optional - for RAG)
   ├─ PDF, DOCX, PPTX, TXT
   ├─ System parses & embeds
   ↓
4. Generate Blueprints
   ├─ Manual: Create blueprints with templates
   ├─ AI: From RAG ("Generate 20 networking Qs")
   ↓
5. Attach Blueprints to Exam
   ├─ Select/order blueprints
   ├─ Link to exam_blueprints table
   ↓
6. Publish Exam
   ├─ Status: draft → published
   ├─ Freeze knowledge base (no new uploads)
   ├─ **Event**: ExamScheduled
   ↓
7. Monitor During Exam
   ├─ View who's online
   ├─ See submissions in real-time
```

### Student: Take Exam

```
1. Login (Firebase)
   ↓
2. View Exams
   ├─ Only see published/active exams
   ↓
3. Click "Start Exam"
   ├─ POST /api/exams/:examId/start
   ├─ Backend: For each blueprint
   │  ├─ Generate seed: SHA256(studentId+blueprintId)
   │  ├─ Create PRNG(seed)
   │  ├─ Select variable set
   │  ├─ Generate unique question
   │  ├─ Store in attempt_questions (LOCKED)
   │  ├─ Log fingerprint to audit_log
   ├─ **Event**: ExamStarted
   ↓
4. See Exam Paper
   ├─ All questions unique to this student
   ├─ Same questions every page refresh
   ├─ Due to locked attempt_questions
   ↓
5. Answer Questions
   ├─ Store answers locally (no submit yet)
   ├─ Timer counts down
   ↓
6. Submit Exam
   ├─ POST /api/exams/:examId/submit
   ├─ Backend: Grade against attempt_questions.correct_option
   ├─ Calculate score & percentage
   ├─ Emit: SubmissionReceived, EvaluationCompleted
   ├─ Generate blockchain certificate (optional)
   ↓
7. View Results
   ├─ Score, grade, certificate
   ├─ Download certificate with QR code
   ├─ View on blockchain (verify authenticity)
```

### Admin: Detect Leaks

```
1. Receive notification
   ├─ "Question paper posted online at github.com/hack/..."
   ↓
2. Go to Admin Dashboard
   ├─ Click "Report Leak" button
   ↓
3. Submit Leak Report
   ├─ Paste leaked question text
   ├─ System generates fingerprint
   ├─ Creates investigation record
   ├─ **Event**: LeakReported
   ↓
4. Analyze Leak
   ├─ Backend computes fingerprints
   ├─ Matches against question_audit_log
   ├─ Finds student(s) who got same variant
   ├─ Shows match confidence
   ↓
5. Review Suspects
   ├─ See which student(s) matched
   ├─ Check attempt details
   ├─ Compare timestamps
   ↓
6. Take Action
   ├─ Disable student account
   ├─ Mark exam as compromised
   ├─ Log disciplinary action
   ├─ Generate incident report
   ├─ **Event**: DisciplinaryActionTaken
```

---

## 💾 DATABASE RELATIONSHIPS

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `blueprints` | Question templates | template_text, options_templates, variable_sets |
| `exam_blueprints` | Link exams to blueprints | exam_id, blueprint_id, position |
| `attempt_questions` | Locked questions per attempt | attempt_id, blueprint_id, question_text, seed, **IMMUTABLE** |
| `question_audit_log` | Fingerprints for leak detection | question_hash, student_id, exam_id, seed |
| `uploaded_documents` | Uploaded PDFs/docs for RAG | file_name, parsing_status, parsed_json |
| `vector_chunks` | Embedded document chunks | document_id, chunk_text, embedding_model |
| `blueprint_candidates` | AI-generated candidates pending review | generated_json, quality_score, status |

### Key Integrity Constraints
```sql
✓ attempt_questions: IMMUTABLE (trigger prevents UPDATE)
✓ exam_blueprints: (exam_id, blueprint_id) UNIQUE
✓ question_audit_log: Indexed by question_hash (for fast leak lookup)
✓ Foreign keys: Cascading deletes where needed
```

---

## 🔌 API Endpoints (46 Total)

### Authentication (3)
```
POST   /api/auth/register      ← Signup
POST   /api/auth/login         ← Login
GET    /api/auth/me            ← Session restore
```

### Exams (12)
```
POST   /api/exams                      ← Create
GET    /api/exams                      ← List
GET    /api/exams/:examId              ← Details
POST   /api/exams/:examId/status       ← Update status
POST   /api/exams/:examId/blueprints   ← Attach blueprints ← NEW
GET    /api/exams/:examId/blueprints   ← List exam blueprints ← NEW
POST   /api/exams/:examId/start        ← Start exam (generate variants) ← NEW
POST   /api/exams/:examId/submit       ← Submit attempt
GET    /api/attempts/:atId/questions   ← Get locked questions ← NEW
POST   /api/knowledge-base/freeze/:id  ← Freeze KB ← NEW
```

### Blueprints (12)
```
POST   /api/blueprints                 ← Create
GET    /api/blueprints                 ← List
GET    /api/blueprints/:id             ← Details
PUT    /api/blueprints/:id             ← Update
POST   /api/blueprints/generate        ← AI generation ← NEW
GET    /api/blueprints/candidates      ← Review candidates ← NEW
POST   /api/blueprints/candidates/:id/approve
POST   /api/blueprints/candidates/:id/reject
```

### RAG Knowledge Base (8)
```
POST   /api/knowledge-base/upload      ← Upload doc ← NEW
POST   /api/knowledge-base/process/:id ← Parse & embed ← NEW
GET    /api/knowledge-base/:examId/status
POST   /api/knowledge-base/freeze/:id
DELETE /api/knowledge-base/:docId
POST   /api/knowledge-base/search
```

### Leak Detection (5)
```
POST   /api/leak/report               ← Report suspected leak ← NEW
POST   /api/leak/investigate/:id      ← Analyze leak ← NEW
GET    /api/leak/investigations       ← List all ← NEW
GET    /api/leak/investigations/:id   ← Details
POST   /api/leak/incident/:studentId/action ← Log action ← NEW
```

### Admin & Analytics (6)
```
GET    /api/admin/dashboard           ← System stats ← NEW
GET    /api/admin/audit-log           ← Audit trail ← NEW
GET    /api/admin/users               ← User list ← NEW
POST   /api/admin/settings            ← Settings ← NEW
GET    /api/blockchain/verify/:hash   ← Verify credential ← NEW
```

---

## 🧪 TESTING STRATEGY

### Quick Test Checklist
```bash
# 1. Backend tests
cd backend && npm test

# 2. Variant consistency (most critical)
TEST: Same seed → Same variant ✓
TEST: Different students → Different variants ✓
TEST: Page refresh → Same questions ✓

# 3. E2E workflow
Scenario: Faculty creates exam with 2 blueprints
          Students A & B take exam
          Verify questions different
          Verify leak detection works

# 4. Load test
Concurrent: 100 students starting same exam
Expected: All variants generated in <2s
```

---

## 🔐 SECURITY FEATURES

| Feature | Implementation | Status |
|---------|---|---|
| Role-Based Access (RBAC) | Faculty ≠ Blueprint data, Student ≠ Question templates | ⚙️ Implementing |
| Rate Limiting | 5 submits/min per student, 10 uploads/hr per faculty | ⚙️ Implementing |
| SQL Injection Prevention | Parameterized queries (already in place) | ✅ |
| XSS Prevention | DOMPurify on all user inputs | ⚙️ Implementing |
| Audit Logging | Log all sensitive actions with timestamps | ⚙️ Implementing |
| Token Expiration | JWT TTL 1 hour, refresh tokens | ✅ |
| Attempt Immutability | Database trigger prevents updates | ⚙️ Implementing |
| Fingerprint Traceability | SHA256 hash per question | ⚙️ Implementing |

---

## 📈 METRICS TO TRACK

### Performance Metrics
```
- Variant generation latency: Target <500ms per question
- Qdrant search latency: Target <100ms
- Gemini API response: Target <3s for blueprint generation
- Page load time: Target <2s for exam page
- Concurrent users: Target support 100+ simultaneous
```

### Security Metrics
```
- Paper leak detection rate: Target 95%+ accuracy
- False positive rate: Target <5%
- Audit log entries: Track all sensitive ops
- Permission violations: Alert if >5 in 1 hour
```

### Business Metrics
```
- Exams created with blueprints: Target 80% adoption
- RAG documents uploaded: Track engagement
- Papers detected leaked: Monitor threats
- Blockchain certificates issued: Track compliance
```

---

## 🎓 LEARNING RESOURCES

### Key Technologies
- **Qdrant:** [qdrant.tech](https://qdrant.tech) - Vector search tutorial
- **OpenAI Embeddings:** [platform.openai.com/docs/api-reference/embeddings](https://platform.openai.com/docs/api-reference/embeddings)
- **Gemini API:** [developers.google.com/generative-ai](https://developers.google.com/generative-ai)
- **Redis Pub/Sub:** [redis.io/topics/pubsub](https://redis.io/topics/pubsub)
- **PostgreSQL:** [postgresql.org/docs](https://postgresql.org/docs)

### Architecture Concepts
- Vector databases for semantic search
- Event-driven architecture patterns
- Deterministic randomness with PRNG
- Zero-trust security model
- Audit logging best practices

---

## 🆘 SUPPORT & RESOURCES

### Documentation Files
1. **SECUREEXAM_AI_SYSTEM_DESIGN.md** ← **START HERE** (Full system design, all phases)
2. **IMPLEMENTATION_GUIDE.md** (Code examples, architecture details)
3. **DEVELOPMENT_CHECKLIST.md** (Task breakdown, timeline, troubleshooting)
4. **SECUREEXAM_AI_SQL_SCHEMA.sql** (Database schema, ready to deploy)
5. **QUICK_REFERENCE.md** (This file)

### Getting Help
```
Question about...           → See...
────────────────────────────────────────────
Database schema             SECUREEXAM_AI_SQL_SCHEMA.sql
Variant generation logic    IMPLEMENTATION_GUIDE.md (Phase 6)
RAG integration            SYSTEM_DESIGN.md (Phase 3-4)
Deployment steps           DEVELOPMENT_CHECKLIST.md
Specific code examples     IMPLEMENTATION_GUIDE.md
```

---

## 📅 TIMELINE SUMMARY

```
WEEK 1:        WEEK 2:           WEEK 3+:
──────────     ──────────────     ─────────
Day 1-2        Day 6-7            Phase 11-12
Blueprints     RAG + Generator    DB Optimization
              
Day 2-4        Day 8-9            Blockchain
Variants       Leak Detection     Integration
              
Day 4-5        Day 10             Full Testing
Testing        Security & Events  Deployment
              
DELIVERABLE:   DELIVERABLE:       DELIVERABLE:
MVP Working    RAG + Leaks        Production Ready
```

**Total:** 90-110 hours (~2-3 weeks full-time)

---

## ✅ SUCCESS CRITERIA

Your SecureExam AI implementation is complete when:

- [ ] ✅ Students see unique question papers (variants)
- [ ] ✅ Same papers on page refresh (immutability)
- [ ] ✅ Documents upload and parse automatically
- [ ] ✅ AI generates blueprint candidates from docs
- [ ] ✅ Faculty approves/rejects candidates
- [ ] ✅ Paper leaks detected via fingerprints
- [ ] ✅ Admin can investigate and trace leaks
- [ ] ✅ Comprehensive audit trail maintained
- [ ] ✅ Role-based access enforced
- [ ] ✅ Certificates issued on blockchain
- [ ] ✅ Load tested for 100+ concurrent users
- [ ] ✅ Zero SQL injection vulnerabilities
- [ ] ✅ Complete test coverage (>80%)
- [ ] ✅ Deployed to production

---

## 🚀 LAUNCH CHECKLIST

Before going live:

- [ ] Run full database migration
- [ ] Deploy backend to production
- [ ] Deploy frontend to CDN
- [ ] Verify all API endpoints responding
- [ ] Test end-to-end workflow
- [ ] Monitor logs for errors
- [ ] Load test concurrent users
- [ ] Security scan passed
- [ ] Backup strategy tested
- [ ] Incident response plan ready
- [ ] Team trained on operations
- [ ] Announce to users

Announce: **"SecureExam AI is LIVE!"** 🎉

---

**Next Steps:**
1. Read `SECUREEXAM_AI_SYSTEM_DESIGN.md` (complete overview)
2. Run database migrations using `SECUREEXAM_AI_SQL_SCHEMA.sql`
3. Start Phase 2 (Blueprint System) using `IMPLEMENTATION_GUIDE.md`
4. Track progress with `DEVELOPMENT_CHECKLIST.md`

**Good luck! You're building the future of secure examinations.** 🎯

---

**Document Version:** 1.0  
**Last Updated:** June 14, 2026  
**Status:** READY FOR PRODUCTION

