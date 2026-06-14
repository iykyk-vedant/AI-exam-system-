-- Migration: Make attempt_questions immutable (prevent UPDATE)

BEGIN;

-- Create audit table if not exists (used by services)
CREATE TABLE IF NOT EXISTS question_audit_log (
  id BIGSERIAL PRIMARY KEY,
  question_hash TEXT NOT NULL,
  student_id TEXT,
  attempt_id UUID,
  blueprint_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add created_at to attempt_questions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='attempt_questions' AND column_name='created_at'
  ) THEN
    ALTER TABLE attempt_questions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END$$;

-- Create function to prevent updates
CREATE OR REPLACE FUNCTION prevent_attempt_questions_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'attempt_questions rows are immutable and cannot be updated';
  RETURN NULL;
END;
$$;

-- Attach trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_prevent_attempt_questions_update'
  ) THEN
    CREATE TRIGGER tg_prevent_attempt_questions_update
+      BEFORE UPDATE ON attempt_questions
+      FOR EACH ROW EXECUTE PROCEDURE prevent_attempt_questions_update();
  END IF;
END$$;

COMMIT;
