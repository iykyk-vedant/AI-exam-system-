exports.up = async function(knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_uid VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await knex.raw(`
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
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options TEXT[] NOT NULL,
      correct_option INTEGER NOT NULL
    );
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
      student_uid VARCHAR(255),
      score NUMERIC(5, 2) NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage NUMERIC(5, 2) NOT NULL,
      passed BOOLEAN NOT NULL,
      attempt_number INTEGER DEFAULT 1,
      cgpa NUMERIC(4, 2),
      violations_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'submitted',
      submitted_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await knex.raw(`
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
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS exam_blueprints (
      exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
      blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      PRIMARY KEY (exam_id, blueprint_id)
    );
  `);

  await knex.raw(`
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
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS uploaded_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name VARCHAR(255) NOT NULL,
      uploaded_by VARCHAR(255) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      processing_status VARCHAR(50) DEFAULT 'UPLOADED',
      report_json JSONB,
      parsed_json JSONB
    );
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_document_id UUID REFERENCES uploaded_documents(id) ON DELETE CASCADE,
      topic_name VARCHAR(255) NOT NULL,
      description TEXT,
      confidence_score NUMERIC(4, 2) DEFAULT 1.00,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await knex.raw(`
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
  `);

  await knex.raw(`
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
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await knex.raw(`
    INSERT INTO system_settings (key, value)
    VALUES ('institution_name', 'XYZ University')
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = async function(knex) {
  // Not dropping tables to prevent accidental data loss in this migration
};
