-- ============================================================
-- Coach Activity Log
-- Allows coaches to log paid activities (kit arrangement,
-- supervision, other) not tied to any course.
-- Billed at coaches base hourly rate automatically.
-- Auto-appears in invoices via coach_monthly_totals view.
-- ============================================================

-- 1. Make course_id nullable (activities have no course)
ALTER TABLE public.sessions ALTER COLUMN course_id DROP NOT NULL;

-- 2. Add activity columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS activity_type        TEXT,
  ADD COLUMN IF NOT EXISTS activity_description TEXT;

-- 3. Valid activity types only
ALTER TABLE public.sessions
  ADD CONSTRAINT chk_activity_type
  CHECK (activity_type IS NULL OR activity_type IN ('kit_arrangement', 'supervision', 'other'));

-- 4. Every row must be a session (course_id set) OR an activity (activity_type set)
ALTER TABLE public.sessions
  ADD CONSTRAINT chk_session_or_activity
  CHECK (course_id IS NOT NULL OR activity_type IS NOT NULL);

-- Verify
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'sessions'
  AND column_name IN ('course_id', 'activity_type', 'activity_description')
ORDER BY ordinal_position;
