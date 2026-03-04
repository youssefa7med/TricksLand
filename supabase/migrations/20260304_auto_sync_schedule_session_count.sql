-- ============================================================
-- Migration: auto update sessions_completed in course_schedules
-- Date: 2026-03-04
--
-- When a coach logs a session (INSERT) → increment sessions_completed
-- in the active schedule for that course.
-- When a session is deleted (DELETE) → decrement it back.
-- This keeps the scheduling progress bar in sync automatically.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_schedule_session_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course_id UUID;
BEGIN
    -- Determine the course_id depending on the trigger operation
    IF TG_OP = 'INSERT' THEN
        v_course_id := NEW.course_id;
    ELSE
        v_course_id := OLD.course_id;
    END IF;

    IF v_course_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        UPDATE public.course_schedules
        SET
            sessions_completed = sessions_completed + 1,
            updated_at = NOW()
        WHERE course_id = v_course_id
          AND status = 'active';

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.course_schedules
        SET
            sessions_completed = GREATEST(0, sessions_completed - 1),
            updated_at = NOW()
        WHERE course_id = v_course_id
          AND status = 'active';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_schedule_session_count() TO authenticated;

-- Drop and recreate to apply latest logic
DROP TRIGGER IF EXISTS trg_sync_schedule_session_count ON public.sessions;

CREATE TRIGGER trg_sync_schedule_session_count
    AFTER INSERT OR DELETE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_schedule_session_count();

-- ─────────────────────────────────────────────────────────────
-- Backfill: recount sessions_completed for all active schedules
-- (fixes any drift from sessions logged before this migration)
-- ─────────────────────────────────────────────────────────────
UPDATE public.course_schedules cs
SET
    sessions_completed = (
        SELECT COUNT(*)
        FROM   public.sessions s
        WHERE  s.course_id = cs.course_id
    ),
    updated_at = NOW()
WHERE cs.status = 'active';
