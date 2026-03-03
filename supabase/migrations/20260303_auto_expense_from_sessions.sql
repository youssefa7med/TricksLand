-- ============================================================
-- Migration: auto-insert course_expenses when a session is logged
-- Date: 2026-03-03
--
-- Problem:
--   record_coach_session_expense() only fires on GPS checkout (PATCH route).
--   Sessions logged manually (coach sessions page → invoices) compute a
--   subtotal via the sessions trigger but never write to course_expenses.
--
-- Solution:
--   1. Add session_id column to course_expenses for proper dedup.
--   2. Trigger function: auto_expense_from_session() — fires AFTER INSERT/UPDATE
--      on sessions when subtotal is set; idempotent via ON CONFLICT (session_id).
--   3. Backfill existing sessions that already have a subtotal but no expense.
--   4. Patch record_coach_session_expense() to also set session_id so the GPS
--      checkout path uses the same dedup column (replaces LIKE-description hack).
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Add session_id to course_expenses (nullable, unique when set)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.course_expenses
    ADD COLUMN IF NOT EXISTS session_id UUID
        REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Unique constraint so ON CONFLICT works correctly
DROP INDEX IF EXISTS idx_course_expenses_session_id;
CREATE UNIQUE INDEX idx_course_expenses_session_id
    ON public.course_expenses (session_id)
    WHERE session_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 2. Trigger function: auto-insert expense on session insert/update
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_expense_from_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coach_name TEXT;
BEGIN
    -- Only act when subtotal is positive (trigger may fire before rate is computed)
    IF NEW.subtotal IS NULL OR NEW.subtotal <= 0 THEN
        RETURN NEW;
    END IF;

    -- Only need a course to assign the expense to
    IF NEW.course_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Resolve coach display name
    SELECT full_name INTO v_coach_name
    FROM   public.profiles
    WHERE  id = NEW.paid_coach_id;

    -- Insert or update expense for this session
    IF EXISTS (SELECT 1 FROM public.course_expenses WHERE session_id = NEW.id) THEN
        UPDATE public.course_expenses
        SET
            amount       = NEW.subtotal,
            description  = ROUND(COALESCE(NEW.computed_hours, 0), 2)::TEXT
                               || ' hr(s) × ' || COALESCE(NEW.applied_rate, 0)::TEXT || ' EGP/hr',
            expense_date = NEW.session_date,
            title        = 'Coach session – ' || COALESCE(v_coach_name, 'Unknown')
        WHERE session_id = NEW.id;
    ELSE
        INSERT INTO public.course_expenses (
            course_id, session_id, title, description,
            amount, expense_date, category, created_by
        ) VALUES (
            NEW.course_id,
            NEW.id,
            'Coach session – ' || COALESCE(v_coach_name, 'Unknown'),
            ROUND(COALESCE(NEW.computed_hours, 0), 2)::TEXT
                || ' hr(s) × ' || COALESCE(NEW.applied_rate, 0)::TEXT || ' EGP/hr',
            NEW.subtotal,
            NEW.session_date,
            'instructor',
            NEW.paid_coach_id
        );
    END IF;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_expense_from_session() TO authenticated;

-- Create the trigger (replace if exists)
DROP TRIGGER IF EXISTS trg_auto_expense_from_session ON public.sessions;
CREATE TRIGGER trg_auto_expense_from_session
    AFTER INSERT OR UPDATE OF subtotal ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_expense_from_session();


-- ─────────────────────────────────────────────────────────────
-- 3. Patch record_coach_session_expense() to use session_id dedup
--    (removes the fragile LIKE-description hack)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_coach_session_expense(
    p_attendance_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coach_id      UUID;
    v_session_id    UUID;
    v_course_id     UUID;
    v_session_date  DATE;
    v_billed_hours  NUMERIC;
    v_rate          NUMERIC;
    v_amount        NUMERIC;
    v_coach_name    TEXT;
BEGIN
    -- Fetch attendance record
    SELECT coach_id, session_id, billed_hours
    INTO   v_coach_id, v_session_id, v_billed_hours
    FROM   public.coach_attendance
    WHERE  id = p_attendance_id;

    IF v_billed_hours IS NULL OR v_billed_hours <= 0 THEN
        RETURN; -- nothing to expense (GPS not used / 0 modules)
    END IF;

    -- Session info
    SELECT course_id, session_date
    INTO   v_course_id, v_session_date
    FROM   public.sessions
    WHERE  id = v_session_id;

    IF v_course_id IS NULL THEN
        RETURN;
    END IF;

    -- Resolve coach rate: course-specific > base_hourly_rate
    SELECT COALESCE(
        (
            SELECT ccr.rate
            FROM   public.course_coach_rates ccr
            WHERE  ccr.coach_id  = v_coach_id
              AND  ccr.course_id = v_course_id
              AND  ccr.effective_from <= v_session_date
            ORDER  BY ccr.effective_from DESC
            LIMIT  1
        ),
        (
            SELECT base_hourly_rate
            FROM   public.profiles
            WHERE  id = v_coach_id
        ),
        0
    )
    INTO v_rate;

    IF v_rate <= 0 THEN
        RETURN;
    END IF;

    v_amount := ROUND(v_billed_hours * v_rate, 2);

    SELECT full_name INTO v_coach_name
    FROM   public.profiles
    WHERE  id = v_coach_id;

    -- GPS billed hours take priority over scheduled hours — update if row exists
    IF EXISTS (SELECT 1 FROM public.course_expenses WHERE session_id = v_session_id) THEN
        UPDATE public.course_expenses
        SET
            amount      = v_amount,
            description = v_billed_hours::TEXT || ' billed hr(s) × ' || v_rate::TEXT
                              || ' EGP/hr (GPS check-in/out, 15-min modules)',
            title       = 'Coach session – ' || COALESCE(v_coach_name, 'Unknown')
        WHERE session_id = v_session_id;
    ELSE
        INSERT INTO public.course_expenses (
            course_id, session_id, title, description,
            amount, expense_date, category, created_by
        ) VALUES (
            v_course_id,
            v_session_id,
            'Coach session – ' || COALESCE(v_coach_name, 'Unknown'),
            v_billed_hours::TEXT || ' billed hr(s) × ' || v_rate::TEXT
                || ' EGP/hr (GPS check-in/out, 15-min modules)',
            v_amount,
            v_session_date,
            'instructor',
            v_coach_id
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_coach_session_expense(UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4. Backfill: create course_expenses for sessions that already
--    have a subtotal but no expense row yet
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.course_expenses (
    course_id,
    session_id,
    title,
    description,
    amount,
    expense_date,
    category,
    created_by
)
SELECT
    s.course_id,
    s.id,
    'Coach session – ' || COALESCE(p.full_name, 'Unknown'),
    ROUND(COALESCE(s.computed_hours, 0), 2)::TEXT
        || ' hr(s) × ' || COALESCE(s.applied_rate, 0)::TEXT || ' EGP/hr',
    s.subtotal,
    s.session_date,
    'instructor',
    s.paid_coach_id
FROM   public.sessions s
LEFT   JOIN public.profiles p ON p.id = s.paid_coach_id
WHERE  s.subtotal IS NOT NULL
  AND  s.subtotal > 0
  AND  s.course_id IS NOT NULL
  AND  NOT EXISTS (
      SELECT 1 FROM public.course_expenses ce
      WHERE ce.session_id = s.id
  );
