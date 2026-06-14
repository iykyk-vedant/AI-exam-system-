-- SecureExam AI - Complete Database Schema & Migration Scripts
-- Version: 1.0
-- Date: June 14, 2026
-- Database: PostgreSQL 15+

/*
MIGRATION STRATEGY:
1. Add new tables without modifying existing ones
2. Keep legacy data intact (questions table)
3. Support parallel operation (blend of old & new systems)
4. Run in transaction (all or nothing)
*/

BEGIN TRANSACTION;

-- ============================================================================
-- PHASE 2: BLUEPRINT SYSTEM TABLES
-- ============================================================================

-- Enhanced Blueprint Table (if not exists)
CREATE TABLE IF NOT EXISTS blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    difficulty VARCHAR(50),
    question_type VARCHAR(50) DEFAULT 'multiple-choice',
    learning_objective TEXT,
    template_text TEXT NOT NULL,
    options_templates TEXT[] NOT NULL,
    correct_option_template TEXT NOT NULL,
    variable_sets JSONB NOT NULL,
    tags TEXT[],
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEPRECATED', 'ARCHIVED')),
    version_number INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_blueprints_created_by ON blueprints(created_by);
CREATE INDEX IF NOT EXISTS idx_blueprints_topic ON blueprints(topic);
CREATE INDEX IF NOT EXISTS idx_blueprints_status ON blueprints(status);

-- Link Table: Exams ↔ Blueprints
CREATE TABLE IF NOT EXISTS exam_blueprints (
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (exam_id, blueprint_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_blueprints_exam_id ON exam_blueprints(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_blueprints_blueprint_id ON exam_blueprints(blueprint_id);

-- ============================================================================
-- PHASE 3: RAG KNOWLEDGE BASE TABLES
-- ============================================================================

-- Uploaded Documents Table (enhanced)
CREATE TABLE IF NOT EXISTS uploaded_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'UPLOADED' 
        CHECK (processing_status IN ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED')),
    report_json JSONB,
    parsed_json JSONB,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_uploaded_documents_exam_id ON uploaded_documents(exam_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_by ON uploaded_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON uploaded_documents(processing_status);

-- Topics Extracted from Documents
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    description TEXT,
    confidence_score NUMERIC(4, 2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_source_document_id ON topics(source_document_id);
CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(topic_name);

-- Concept Candidates (LLM-extracted learning objectives)
CREATE TABLE IF NOT EXISTS concept_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    raw_concept TEXT NOT NULL,
    normalized_concept TEXT NOT NULL,
    learning_objective TEXT,
    difficulty VARCHAR(50) DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    confidence_score NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    extraction_reason TEXT,
    source_snippet TEXT,
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW' 
        CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concept_candidates_doc_id ON concept_candidates(source_document_id);
CREATE INDEX IF NOT EXISTS idx_concept_candidates_topic_id ON concept_candidates(topic_id);
CREATE INDEX IF NOT EXISTS idx_concept_candidates_status ON concept_candidates(status);

-- Blueprint Candidates (AI-generated, pending review)
CREATE TABLE IF NOT EXISTS blueprint_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    concept_candidate_id UUID REFERENCES concept_candidates(id) ON DELETE SET NULL,
    original_question TEXT NOT NULL,
    generated_json JSONB NOT NULL,
    quality_score INTEGER NOT NULL DEFAULT 100 CHECK (quality_score >= 0 AND quality_score <= 100),
    confidence_score NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW' 
        CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED')),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprint_candidates_doc_id ON blueprint_candidates(source_document_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_candidates_concept_id ON blueprint_candidates(concept_candidate_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_candidates_status ON blueprint_candidates(status);

-- Vector Chunks (for RAG matching)
CREATE TABLE IF NOT EXISTS vector_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INTEGER,
    vector_id VARCHAR(255),
    embedding_model VARCHAR(100) DEFAULT 'openai-embedding-3',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vector_chunks_document_id ON vector_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_vector_chunks_vector_id ON vector_chunks(vector_id);

-- RAG Knowledge Base Status (per exam)
CREATE TABLE IF NOT EXISTS rag_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(50) DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'FROZEN', 'ARCHIVED')),
    documents_count INTEGER DEFAULT 0,
    chunks_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    frozen_at TIMESTAMP,
    archived_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_kb_exam_id ON rag_knowledge_bases(exam_id);
CREATE INDEX IF NOT EXISTS idx_rag_kb_status ON rag_knowledge_bases(status);

-- ============================================================================
-- PHASE 6 & 7: VARIANT GENERATION & ATTEMPT LOCKING
-- ============================================================================

-- Locked Attempt Questions (immutable after creation)
CREATE TABLE IF NOT EXISTS attempt_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
    variant_seed VARCHAR(255) NOT NULL,
    question_number INTEGER,
    question_text TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_option INTEGER NOT NULL CHECK (correct_option >= 0),
    correct_answer_text TEXT,
    selected_variables JSONB NOT NULL,
    question_hash VARCHAR(64),
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(attempt_id, blueprint_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt_id ON attempt_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_questions_blueprint_id ON attempt_questions(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_attempt_questions_question_hash ON attempt_questions(question_hash);

-- Immutability Trigger (Prevent updates to attempt_questions)
CREATE OR REPLACE FUNCTION prevent_attempt_questions_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Attempt questions are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attempt_questions_immutable_trigger
BEFORE UPDATE ON attempt_questions
FOR EACH ROW
EXECUTE FUNCTION prevent_attempt_questions_update();

-- ============================================================================
-- PHASE 8: LEAK TRACEABILITY
-- ============================================================================

-- Question Audit Log (fingerprints for leak detection)
CREATE TABLE IF NOT EXISTS question_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES attempt_questions(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
    student_id VARCHAR(255) NOT NULL,
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    question_hash VARCHAR(64) NOT NULL,
    options_hash VARCHAR(64),
    seed VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    fingerprint_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_question_hash ON question_audit_log(question_hash);
CREATE INDEX IF NOT EXISTS idx_audit_log_student_id ON question_audit_log(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_exam_id ON question_audit_log(exam_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_attempt_id ON question_audit_log(attempt_id);

-- Leak Investigations
CREATE TABLE IF NOT EXISTS leak_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_at TIMESTAMP DEFAULT NOW(),
    reported_by VARCHAR(255),
    source_url VARCHAR(1000),
    leaked_question_hashes TEXT[],
    matched_students TEXT[],
    match_confidence NUMERIC(3, 2),
    incident_severity VARCHAR(50) DEFAULT 'MEDIUM' 
        CHECK (incident_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    investigation_status VARCHAR(50) DEFAULT 'OPEN' 
        CHECK (investigation_status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    actions_taken TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leak_investigations_severity ON leak_investigations(incident_severity);
CREATE INDEX IF NOT EXISTS idx_leak_investigations_status ON leak_investigations(investigation_status);

-- ============================================================================
-- PHASE 9: EVENT-DRIVEN ARCHITECTURE
-- ============================================================================

-- Event Log (for audit trail)
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    triggered_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON system_events(created_at DESC);

-- ============================================================================
-- PHASE 10: SECURITY & AUDIT
-- ============================================================================

-- Comprehensive Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'DENIED', 'ERROR')),
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PHASE 11: ENHANCEMENTS TO EXISTING TABLES
-- ============================================================================

-- Enhancements to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB;

-- Enhancements to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS questions_mode VARCHAR(50) DEFAULT 'LEGACY' 
    CHECK (questions_mode IN ('LEGACY', 'BLUEPRINT'));
ALTER TABLE exams ADD COLUMN IF NOT EXISTS kb_freeze_at TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS kb_status VARCHAR(50) DEFAULT 'ACTIVE' 
    CHECK (kb_status IN ('ACTIVE', 'FROZEN', 'ARCHIVED'));
ALTER TABLE exams ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'PUBLIC' 
    CHECK (visibility IN ('PUBLIC', 'PRIVATE', 'DRAFT'));

-- Enhancements to exam_attempts table
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS violations_count INTEGER DEFAULT 0;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'submitted' 
    CHECK (status IN ('in_progress', 'submitted', 'graded', 'cancelled'));
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS proctoring_flags JSONB;

-- ============================================================================
-- BLOCKCHAIN INTEGRATION (PHASE 12)
-- ============================================================================

-- On-chain Credentials Log
CREATE TABLE IF NOT EXISTS blockchain_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(255) NOT NULL,
    attempt_id UUID REFERENCES exam_attempts(id),
    exam_id UUID REFERENCES exams(id),
    certificate_hash VARCHAR(64) NOT NULL,
    transaction_hash VARCHAR(255),
    blockchain_network VARCHAR(50) DEFAULT 'polygon-amoy',
    certificate_url TEXT,
    smart_contract_address VARCHAR(255),
    issued_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_student_id ON blockchain_credentials(student_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_exam_id ON blockchain_credentials(exam_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transaction_hash ON blockchain_credentials(transaction_hash);

-- ============================================================================
-- SEED INITIAL SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value) VALUES
    ('institution_name', 'XYZ University'),
    ('version', '1.0'),
    ('max_question_variants_per_blueprint', '100'),
    ('rag_chunk_size_tokens', '512'),
    ('rag_chunk_overlap_tokens', '50'),
    ('embedding_model', 'openai-embedding-3'),
    ('llm_model', 'gemini-2.5-flash'),
    ('knowledge_base_auto_archive_days', '7')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- FINAL CHECKS & INDEXES
-- ============================================================================

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attempts_exam_student ON exam_attempts(exam_id, student_uid);
CREATE INDEX IF NOT EXISTS idx_blueprints_exam ON exam_blueprints(exam_id) 
    INCLUDE (blueprint_id);

-- Verification
SELECT 
    'Blueprints' as table_name, COUNT(*) as row_count FROM blueprints
UNION ALL
SELECT 'ExamBlueprints', COUNT(*) FROM exam_blueprints
UNION ALL
SELECT 'UploadedDocuments', COUNT(*) FROM uploaded_documents
UNION ALL
SELECT 'Topics', COUNT(*) FROM topics
UNION ALL
SELECT 'ConceptCandidates', COUNT(*) FROM concept_candidates
UNION ALL
SELECT 'BlueprintCandidates', COUNT(*) FROM blueprint_candidates
UNION ALL
SELECT 'VectorChunks', COUNT(*) FROM vector_chunks
UNION ALL
SELECT 'RAGKnowledgeBases', COUNT(*) FROM rag_knowledge_bases
UNION ALL
SELECT 'AttemptQuestions', COUNT(*) FROM attempt_questions
UNION ALL
SELECT 'QuestionAuditLog', COUNT(*) FROM question_audit_log
UNION ALL
SELECT 'LeakInvestigations', COUNT(*) FROM leak_investigations
UNION ALL
SELECT 'SystemEvents', COUNT(*) FROM system_events
UNION ALL
SELECT 'AuditLog', COUNT(*) FROM audit_log;

COMMIT;

-- ============================================================================
-- MIGRATION VALIDATION
-- ============================================================================

-- Count new tables created
SELECT schemaname, COUNT(*) as new_tables_created
FROM pg_tables
WHERE tablename IN (
    'blueprints', 'exam_blueprints', 'uploaded_documents', 'topics',
    'concept_candidates', 'blueprint_candidates', 'vector_chunks',
    'rag_knowledge_bases', 'attempt_questions', 'question_audit_log',
    'leak_investigations', 'system_events', 'audit_log', 'blockchain_credentials'
)
GROUP BY schemaname;

-- Verify no data loss in existing tables
SELECT 'questions' as table_name, COUNT(*) as legacy_questions FROM questions
UNION ALL
SELECT 'exam_attempts', COUNT(*) FROM exam_attempts
UNION ALL
SELECT 'exams', COUNT(*) FROM exams
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- ============================================================================
-- REVERSE MIGRATION (ROLLBACK - If Needed)
-- ============================================================================

/*
If you need to rollback this migration, run:

BEGIN TRANSACTION;

DROP TABLE IF EXISTS blockchain_credentials CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS system_events CASCADE;
DROP TABLE IF EXISTS leak_investigations CASCADE;
DROP TABLE IF EXISTS question_audit_log CASCADE;
DROP TABLE IF EXISTS attempt_questions CASCADE;
DROP TABLE IF EXISTS vector_chunks CASCADE;
DROP TABLE IF EXISTS rag_knowledge_bases CASCADE;
DROP TABLE IF EXISTS blueprint_candidates CASCADE;
DROP TABLE IF EXISTS concept_candidates CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS uploaded_documents CASCADE;
DROP TABLE IF EXISTS exam_blueprints CASCADE;
DROP TABLE IF EXISTS blueprints CASCADE;

-- Remove added columns from existing tables
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS last_login;
ALTER TABLE users DROP COLUMN IF EXISTS profile_data;
ALTER TABLE exams DROP COLUMN IF EXISTS questions_mode;
ALTER TABLE exams DROP COLUMN IF EXISTS kb_freeze_at;
ALTER TABLE exams DROP COLUMN IF EXISTS kb_status;
ALTER TABLE exams DROP COLUMN IF EXISTS visibility;
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS violations_count;
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS status;
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS started_at;
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS ip_address;
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS proctoring_flags;

COMMIT;
*/
