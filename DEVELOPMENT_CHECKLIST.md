# SecureExam AI - Development Checklist & Setup Guide

**Version:** 1.0  
**Last Updated:** June 14, 2026

---

## QUICK START

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL client available
- [ ] Git configured
- [ ] VS Code with extensions (optional but recommended)
- [ ] Docker (for Qdrant)

### Required Accounts & Keys (Get Immediately)
- [ ] Firebase project created
- [ ] Neon PostgreSQL database
- [ ] Google Gemini API key
- [ ] OpenAI API key (for embeddings)
- [ ] Qdrant instance (Docker or managed)
- [ ] Redis instance (local or Upstash)
- [ ] Polygon Amoy faucet funds (for testnet)

---

## ENVIRONMENT SETUP

### Step 1: Backend Environment

Create `backend/.env`:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/examination_db

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# API Keys
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-key

# Blockchain
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-key
PRIVATE_KEY=your-wallet-private-key

# App
PORT=5000
NODE_ENV=development
```

### Step 2: Frontend Environment

Create `frontend/.env.local`:
```bash
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Step 3: Docker Setup (Qdrant)

```bash
# Run Qdrant locally (one-time setup)
docker run -p 6333:6333 qdrant/qdrant:latest

# Or use managed Qdrant:
# Sign up at qdrant.tech
# Get QDRANT_URL and QDRANT_API_KEY
```

### Step 4: Redis Setup

```bash
# Option A: Docker
docker run -p 6379:6379 redis:alpine

# Option B: Use Upstash (managed)
# Get REDIS_URL from https://upstash.com

# Option C: Local installation
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server
```

### Step 5: Database Migration

```bash
cd backend

# Load schema
psql $DATABASE_URL < ../SECUREEXAM_AI_SQL_SCHEMA.sql

# Verify
psql $DATABASE_URL -c "SELECT count(*) FROM blueprints;"
```

---

## PHASE-BY-PHASE IMPLEMENTATION CHECKLIST

### PHASE 2: BLUEPRINT SYSTEM ✅

**Backend Changes (4-5 hours)**
- [ ] Update `examController.js` - Add `updateExamBlueprints()` method
- [ ] Add `getExamBlueprints()` endpoint
- [ ] Create migration to add `exam_blueprints` table (already in SQL)
- [ ] Add `questions_mode` column to exams table
- [ ] Test blueprint attachment endpoints

**Frontend Changes (3-4 hours)**
- [ ] Create `BlueprintSelector.jsx` component
- [ ] Update `FacultyDashboard.jsx` with blueprint UI
- [ ] Add blueprint selection flow to exam creation
- [ ] Test blueprint attachment from UI

**Testing (2 hours)**
- [ ] Unit tests for blueprint CRUD
- [ ] Integration tests (create exam → attach blueprints → verify)
- [ ] UI tests (select blueprints, save, reload)

**Deployment (1 hour)**
- [ ] Run SQL migration on staging
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Smoke test exam creation flow

**Timeline:** 10-12 hours | **Priority:** P1 | **Status:** ⏳ Ready to Start

---

### PHASE 3: RAG KNOWLEDGE BASE ⏳

**Backend: Document Processing (6 hours)**
- [ ] Implement `DocumentService.js`
  - [ ] `uploadDocument()` - Save to disk/S3
  - [ ] `parseDocument()` - Extract text from PDF/DOCX
  - [ ] `chunkDocument()` - Split into 512-token chunks
  - [ ] `deleteDocument()` - Cleanup

- [ ] Implement `EmbeddingService.js`
  - [ ] `generateEmbedding()` - Call OpenAI API
  - [ ] `batchEmbeddings()` - Batch process chunks
  - [ ] Error handling & retry logic

- [ ] Implement `VectorService.js`
  - [ ] `connectToQdrant()` - Initialize client
  - [ ] `addChunks()` - Upsert to Qdrant
  - [ ] `searchSimilar()` - Vector search
  - [ ] `freezeCollection()` - Lock KB after exam publish

**Backend: Endpoints (3 hours)**
- [ ] `POST /api/knowledge-base/upload` - File upload (multipart)
- [ ] `POST /api/knowledge-base/process/:docId` - Parse & embed
- [ ] `GET /api/knowledge-base/:examId/status` - KB status
- [ ] `POST /api/knowledge-base/freeze/:examId` - Freeze KB
- [ ] `POST /api/knowledge-base/search` - Vector search (internal)

**Frontend: UI Components (4 hours)**
- [ ] Create `DocumentUploader.jsx` component
- [ ] Create `DocumentList.jsx` - View uploaded docs
- [ ] Update `FacultyDashboard.jsx` with RAG section
- [ ] Show processing status & vector count

**Testing (3 hours)**
- [ ] Test document parsing (PDF, DOCX, TXT)
- [ ] Test chunking logic
- [ ] Test embeddings API integration
- [ ] Test vector search accuracy

**Timeline:** 16-18 hours | **Priority:** P2 | **Status:** Ready after Phase 2

---

### PHASE 4: AI BLUEPRINT GENERATOR ⏳

**Backend: Gemini Integration (5 hours)**
- [ ] Enhance `aiService.js` - Add `generateBlueprintsFromRAG()`
- [ ] Implement `BlueprintGeneratorService.js`
  - [ ] Query RAG for relevant chunks
  - [ ] Build Gemini prompt with context
  - [ ] Parse JSON response
  - [ ] Validate quality & confidence

**Backend: Blueprint Candidate Workflow (4 hours)**
- [ ] `POST /api/blueprints/generate` - Start generation job
- [ ] `GET /api/blueprints/candidates` - List pending candidates
- [ ] `POST /api/blueprints/candidates/:id/approve` - Convert to blueprint
- [ ] `POST /api/blueprints/candidates/:id/reject` - Reject candidate
- [ ] Add async job queue (optional for MVP)

**Frontend: Blueprint Generator UI (5 hours)**
- [ ] Create `BlueprintBuilder.jsx` - Visual blueprint editor
- [ ] Create `GenerationWizard.jsx` - Guided generation flow
- [ ] Create `CandidateReview.jsx` - Review & approve candidates
- [ ] Add to `FacultyDashboard.jsx`

**Testing (2 hours)**
- [ ] Test LLM integration with mock data
- [ ] Test blueprint candidate creation
- [ ] Test approval workflow
- [ ] Test quality scoring

**Timeline:** 16-18 hours | **Priority:** P2 | **Status:** Ready after Phase 3

---

### PHASE 5: KNOWLEDGE BASE FREEZE ⏳

**Backend: Freeze Mechanism (2 hours)**
- [ ] Add `frozen_at` to exams table
- [ ] Add check in document upload: reject if KB frozen
- [ ] Implement `freezeKnowledgeBase()` in VectorService
- [ ] `POST /api/knowledge-base/freeze/:examId` endpoint
- [ ] Auto-freeze on exam publish

**Frontend: UI Updates (1 hour)**
- [ ] Show KB status (ACTIVE/FROZEN/ARCHIVED) in exam details
- [ ] Disable document upload UI when KB frozen
- [ ] Show freeze timestamp

**Testing (1 hour)**
- [ ] Test KB automatically freezes on exam publish
- [ ] Test document upload rejects when frozen
- [ ] Test unfreezing (admin only)

**Timeline:** 4-5 hours | **Priority:** P2 | **Status:** Ready after Phase 3

---

### PHASE 6: DYNAMIC VARIANT GENERATION ✅

**Backend: Variant Generation Engine (8 hours)**
- [ ] Enhance `variantEngine.js`
  - [ ] `VariantGenerator` class - Complete implementation
  - [ ] Deterministic PRNG - Test consistency
  - [ ] Variable substitution - Handle nested expressions
  - [ ] Arithmetic evaluation - Safe parser

- [ ] Update `examController.startExam()` (6 hours)
  - [ ] Get blueprints for exam
  - [ ] For each blueprint, generate variant
  - [ ] Lock in `attempt_questions` table
  - [ ] Log to `question_audit_log`

- [ ] Implement `VariantService.js` (2 hours)
  - [ ] Orchestrate generation
  - [ ] Handle seed management
  - [ ] Cache generated questions

**Backend: Exam Endpoints (3 hours)**
- [ ] `POST /api/exams/:examId/start` - Start exam & generate variants
- [ ] `GET /api/attempts/:attemptId/questions` - Retrieve locked questions (no re-gen)
- [ ] `GET /api/attempts/:attemptId/question/:qId` - Get single question

**Frontend: Exam UI (4 hours)**
- [ ] Update `AttemptExam.jsx` - Display generated questions
- [ ] Show question number, text, options
- [ ] Store selections locally
- [ ] Handle page refresh safely

**Testing (4 hours)**
- [ ] Test variant generation consistency (same seed → same variant)
- [ ] Test different students get different variants
- [ ] Test page refresh doesn't change questions
- [ ] Load test: 1000 students starting same exam

**Timeline:** 19-21 hours | **Priority:** P1 | **Status:** Ready after Phase 2

---

### PHASE 7: ATTEMPT LOCKING ✅

**Backend: Immutability (2 hours)**
- [ ] Add trigger to prevent `attempt_questions` updates
  - [ ] `CREATE TRIGGER attempt_questions_immutable`
  - [ ] Test: Try to update → reject
- [ ] Update `examController.getExamQuestions()` - Never regenerate
- [ ] Verify seed + PRNG approach ensures consistency

**Testing (1 hour)**
- [ ] Test trigger prevents updates
- [ ] Test different calls return identical data

**Timeline:** 3 hours | **Priority:** P1 | **Status:** Ready with Phase 6

---

### PHASE 8: LEAK TRACEABILITY 🆕

**Backend: Fingerprinting (4 hours)**
- [ ] Implement `LeakDetectionService.js`
  - [ ] `generateFingerprint()` - SHA256(questionText + options)
  - [ ] `reportLeak()` - Create investigation
  - [ ] `investigateLeak()` - Match hashes to students
  - [ ] `logDisciplinaryAction()` - Document actions

- [ ] Update variant generation to include fingerprints
  - [ ] Generate SHA256 in `generateVariant()`
  - [ ] Store in `attempt_questions.question_hash`
  - [ ] Log to `question_audit_log`

**Backend: Endpoints (2 hours)**
- [ ] `POST /api/leak/report` - Report suspected leak
- [ ] `POST /api/leak/investigate/:id` - Analyze leak
- [ ] `GET /api/leak/investigations` - List investigations
- [ ] `POST /api/leak/incident/:studentId/action` - Log action

**Frontend: Admin UI (3 hours)**
- [ ] Create `LeakReporter.jsx` - Report leak interface
- [ ] Create `LeakAnalyzer.jsx` - View investigation results
- [ ] Update `AdminDashboard.jsx` with leak tools

**Testing (2 hours)**
- [ ] Test fingerprint generation consistency
- [ ] Test leak reporting & investigation
- [ ] Test suspect ranking algorithm

**Timeline:** 11-12 hours | **Priority:** P2 | **Status:** Ready after Phase 6

---

### PHASE 9: EVENT-DRIVEN ARCHITECTURE 🆕

**Backend: Event Bus (4 hours)**
- [ ] Create `services/eventBus.js`
  - [ ] Redis client initialization
  - [ ] `publish(eventType, payload)` method
  - [ ] `subscribe(eventType, handler)` method

- [ ] Create `listeners/` folder with subscribers
  - [ ] `examStartedListener.js` - Trigger notifications
  - [ ] `submissionReceivedListener.js` - Queue grading
  - [ ] `leakDetectedListener.js` - Alert admins
  - [ ] `index.js` - Centralized registration

- [ ] Emit events from controllers
  - [ ] `ExamScheduled` - In updateExamStatus
  - [ ] `ExamStarted` - In startExam
  - [ ] `QuestionGenerated` - In generation loop
  - [ ] `SubmissionReceived` - In submitExam
  - [ ] `LeakDetected` - In investigateLeak

**Testing (2 hours)**
- [ ] Test publish/subscribe cycle
- [ ] Test event persistence
- [ ] Test listener error handling

**Timeline:** 6-8 hours | **Priority:** P3 | **Status:** Ready after Phase 6

---

### PHASE 10: SECURITY & RBAC 🆕

**Backend: RBAC Implementation (5 hours)**
- [ ] Create `middleware/rbacMiddleware.js`
  - [ ] Permission map for roles
  - [ ] `checkPermission()` middleware
  - [ ] Apply to sensitive endpoints

- [ ] Create `services/auditService.js`
  - [ ] `logAction()` - Log all operations
  - [ ] `logAccessDenied()` - Log rejections
  - [ ] `getAuditLog()` - Query audit trail

- [ ] Add security headers & rate limiting
  - [ ] Helmet.js for headers
  - [ ] express-rate-limit for abuse prevention
  - [ ] CORS configuration

**Backend: Data Protection (2 hours)**
- [ ] Input validation (Joi)
- [ ] SQL injection prevention (already using parameterized queries)
- [ ] XSS sanitization (DOMPurify)
- [ ] JWT token blacklisting on logout

**Testing (2 hours)**
- [ ] Test RBAC permissions
- [ ] Test access denial logging
- [ ] Test rate limiting kicks in

**Timeline:** 9-10 hours | **Priority:** P2 | **Status:** Ready after Phase 6

---

### PHASE 11: DATABASE MIGRATION 🆕

**Pre-Migration Checks (1 hour)**
- [ ] Backup production database
- [ ] Review all new tables
- [ ] Create rollback scripts

**Run Migration (1 hour)**
- [ ] Execute SQL schema script
- [ ] Verify all tables created
- [ ] Check indexes are present
- [ ] Run validation queries

**Post-Migration Verification (1 hour)**
- [ ] Confirm data integrity
- [ ] Test existing queries still work
- [ ] Test new queries
- [ ] Monitor database performance

**Timeline:** 3-4 hours | **Priority:** P1 | **Status:** Ready after Phase 10

---

### PHASE 12: BLOCKCHAIN INTEGRATION 🆕

**Backend: Web3 Setup (3 hours)**
- [ ] Install ethers.js / web3.js
- [ ] Create `services/blockchainService.js`
  - [ ] `recordFingerprint()` - Store on-chain
  - [ ] `issueCertificate()` - Mint credential NFT
  - [ ] `verifyCredential()` - Public verification

- [ ] Update exam submission flow
  - [ ] After grading, record variant hashes
  - [ ] Issue certificate with proof
  - [ ] Generate certificate URL

**Frontend: Certificate Display (2 hours)**
- [ ] Create certificate view component
- [ ] Show blockchain link
- [ ] QR code for verification
- [ ] Share certificate URL

**Testing (1 hour)**
- [ ] Test on Polygon Amoy testnet
- [ ] Test certificate minting
- [ ] Test public verification

**Timeline:** 6-8 hours | **Priority:** P3 | **Status:** Ready after all other phases

---

## TESTING CHECKLIST

### Unit Tests
- [ ] variantEngine.js - Seed generation, substitution, arithmetic
- [ ] LeakDetectionService - Fingerprinting, matching
- [ ] EmbeddingService - API integration
- [ ] VectorService - Qdrant operations
- [ ] RBAC - Permission checks

### Integration Tests
- [ ] Exam creation → Blueprint attachment → Variant generation
- [ ] Document upload → Processing → RAG search → Blueprint generation
- [ ] Leak reporting → Investigation → Suspect matching
- [ ] Event publishing → Subscriber handling
- [ ] Blockchain recording → Verification

### End-to-End Tests (Cypress)
- [ ] Faculty complete workflow (create exam, attach blueprints, publish)
- [ ] Student complete workflow (start exam, answer questions, submit)
- [ ] Admin leak investigation workflow
- [ ] Role-based access (student cannot view blueprints, etc.)

### Performance Tests
- [ ] 1000 concurrent exam starts
- [ ] 10,000 vector operations in Qdrant
- [ ] Gemini API response time (<5s)
- [ ] Database query optimization

### Security Tests
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Token expiration
- [ ] Permission bypass attempts

### Load Tests
- [ ] Sustained 100 concurrent users
- [ ] Spike to 500 concurrent users
- [ ] Memory/CPU under load
- [ ] Database connection pooling

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests on staging
- [ ] Code review completed
- [ ] Performance tests green
- [ ] Security scan passed

### Database
- [ ] Staging migration successful
- [ ] Data integrity verified
- [ ] Rollback plan ready
- [ ] Backup created

### Environment
- [ ] All env vars configured
- [ ] API keys verified
- [ ] Qdrant instance ready
- [ ] Redis instance ready
- [ ] Blockchain network configured

### Frontend
- [ ] Build successful
- [ ] No console errors
- [ ] Performance metrics acceptable
- [ ] Mobile responsive

### Backend
- [ ] Start command works
- [ ] Health check passes
- [ ] All endpoints tested
- [ ] Logs readable

### Deployment Steps
- [ ] [ ] Deploy backend to production
- [ ] [ ] Run database migration
- [ ] [ ] Deploy frontend to CDN
- [ ] [ ] Update DNS (if needed)
- [ ] [ ] Smoke test all flows
- [ ] [ ] Monitor logs for errors
- [ ] [ ] Announce to users

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify no API timeouts
- [ ] Confirm email notifications working
- [ ] Check vector search latency
- [ ] Verify Redis connection stable

---

## WEEKLY PROGRESS TRACKING

### Week 1
- **Days 1-2:** Phase 2 (Blueprint System)
- **Days 3-4:** Phase 6 (Variant Generation)
- **Day 5:** Testing & bug fixes
- **Deliverable:** Working variant generation MVP

### Week 2
- **Days 6-7:** Phase 3-4 (RAG + Blueprint Generator)
- **Days 8-9:** Phase 8 (Leak Traceability)
- **Day 10:** Phase 9-10 (Events + Security)
- **Deliverable:** Complete RAG + leak detection

### Week 3+
- **Phase 11** (Database optimization)
- **Phase 12** (Blockchain integration)
- **Full testing & deployment**
- **Deliverable:** Production-ready system

---

## TROUBLESHOOTING

### Common Issues

#### Database Connection Failed
```bash
# Check Neon URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check firewall/VPN
```

#### Gemini API Rate Limited
```bash
# Reduce concurrent requests
# Use exponential backoff
# Check quota at https://console.anthropic.com
```

#### Qdrant Connection Issues
```bash
# Check if service running
docker ps | grep qdrant

# Test connection
curl http://localhost:6333/health

# Restart if needed
docker restart qdrant
```

#### Firebase Token Invalid
```bash
# Verify Firebase config
cat $FIREBASE_PRIVATE_KEY

# Check token TTL (1 hour default)
```

---

**Total Estimated Hours:** 90-110 hours  
**Total Estimated Timeline:** 2-3 weeks full-time  
**Start Date:** June 14, 2026  
**Target Completion:** July 4, 2026

