-- ============================================================
-- Migration: fix sessions_completed trigger
-- Date: 2026-03-04
--
-- BUG: Previous trigger fired on INSERT to `sessions`, but
-- sessions are pre-created by admin at course setup time.
-- The real "session was delivered" event is an INSERT into
-- `coach_attendance` (both GPS check-in and admin mark).
--
-- FIX: Move trigger to coach_attendance table.
-- ============================================================

-- 1. Drop old (wrong) trigger on sessions
DROP TRIGGER IF EXISTS trg_sync_schedule_session_count ON public.sessions;

-- 2. Drop old function
DROP FUNCTION IF EXISTS public.sync_schedule_session_count();

-- 3. Create corrected function that reads course_id from sessions
CREATE OR REPLACE FUNCTION public.sync_schedule_session_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course_id UUID;
BEGIN
    -- Get the course_id from the sessions row linked to this attendance
    IF TG_OP = 'INSERT' THEN
        SELECT course_id INTO v_course_id
        FROM public.sessions
        WHERE id = NEW.session_id;
    ELSE
        SELECT course_id INTO v_course_id
        FROM public.sessions
        WHERE id = OLD.session_id;
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

-- 4. Create trigger on coach_attendance instead
DROP TRIGGER IF EXISTS trg_sync_schedule_session_count ON public.coach_attendance;

CREATE TRIGGER trg_sync_schedule_session_count
    AFTER INSERT OR DELETE ON public.coach_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_schedule_session_count();

-- ─────────────────────────────────────────────────────────────
-- 5. Backfill: recount sessions_completed from actual attendance
--    records (reset drift from old wrong-trigger era)
-- ─────────────────────────────────────────────────────────────
UPDATE public.course_schedules cs
SET
    sessions_completed = (
        SELECT COUNT(DISTINCT ca.id)
        FROM   public.coach_attendance ca
        JOIN   public.sessions s ON s.id = ca.session_id
        WHERE  s.course_id = cs.course_id
    ),
    updated_at = NOW()
WHERE cs.status = 'active';
