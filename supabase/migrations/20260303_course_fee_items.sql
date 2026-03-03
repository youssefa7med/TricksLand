-- ============================================================
-- Migration: course_fee_items + student_payments multi-fee support
-- + auto-expense on coach checkout
-- ============================================================

-- 1. ── course_fee_items ──────────────────────────────────────
--    Defines named fee line-items for a course (e.g. "Course fee", 
--    "Competition registration").  Multiple items per course.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_fee_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    amount      NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_fee_items_course
    ON public.course_fee_items (course_id, sort_order);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_fee_items_updated_at ON public.course_fee_items;
CREATE TRIGGER trg_course_fee_items_updated_at
    BEFORE UPDATE ON public.course_fee_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. ── student_payments: add fee_item_id column ──────────────
--    Nullable so existing rows (legacy "single fee") remain valid.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.student_payments
    ADD COLUMN IF NOT EXISTS fee_item_id UUID
        REFERENCES public.course_fee_items(id) ON DELETE CASCADE;


-- 3. ── unique constraints ────────────────────────────────────
--    • Legacy row (fee_item_id IS NULL):  unique per (student, course)
--    • New row   (fee_item_id NOT NULL):  unique per (student, course, item)
-- ─────────────────────────────────────────────────────────────

-- Drop the old simple unique constraint (it was created by the attendance migration)
ALTER TABLE public.student_payments
    DROP CONSTRAINT IF EXISTS student_payments_student_id_course_id_key;

-- Partial unique index for legacy records (no fee item)
DROP INDEX IF EXISTS student_payments_no_fee_item_unique;
CREATE UNIQUE INDEX student_payments_no_fee_item_unique
    ON public.student_payments (student_id, course_id)
    WHERE fee_item_id IS NULL;

-- Partial unique index for per-fee-item records
DROP INDEX IF EXISTS student_payments_with_fee_item_unique;
CREATE UNIQUE INDEX student_payments_with_fee_item_unique
    ON public.student_payments (student_id, course_id, fee_item_id)
    WHERE fee_item_id IS NOT NULL;


-- 4. ── RLS on course_fee_items ───────────────────────────────
ALTER TABLE public.course_fee_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "fee_items_admin_all" ON public.course_fee_items;
CREATE POLICY "fee_items_admin_all"
    ON public.course_fee_items FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Coaches / everyone authenticated can read
DROP POLICY IF EXISTS "fee_items_read_authenticated" ON public.course_fee_items;
CREATE POLICY "fee_items_read_authenticated"
    ON public.course_fee_items FOR SELECT TO authenticated
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_fee_items TO authenticated;


-- 5. ── Function: auto-insert course_expense after coach checkout ────
--    Called from the PATCH checkout endpoint logic (see route.ts).
--    Exposed as a Postgres function so the API can call it via RPC
--    in a single round-trip.
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
        RETURN; -- nothing to expense
    END IF;

    -- Fetch session info (course + date)
    SELECT course_id, session_date
    INTO   v_course_id, v_session_date
    FROM   public.sessions
    WHERE  id = v_session_id;

    -- Resolve coach rate: prefer course-specific rate, fall back to base rate
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
        RETURN; -- no rate configured, skip
    END IF;

    v_amount := v_billed_hours * v_rate;

    -- Coach name for the expense title
    SELECT full_name INTO v_coach_name
    FROM   public.profiles
    WHERE  id = v_coach_id;

    -- Insert course expense (skip if already recorded for this attendance)
    INSERT INTO public.course_expenses (
        course_id,
        title,
        description,
        amount,
        expense_date,
        category,
        created_by
    )
    SELECT
        v_course_id,
        'Coach session – ' || COALESCE(v_coach_name, 'Unknown'),
        v_billed_hours::TEXT || ' billed hr(s) × ' || v_rate::TEXT || ' EGP/hr (attendance ' || p_attendance_id || ')',
        v_amount,
        v_session_date,
        'instructor',
        v_coach_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.course_expenses
        WHERE description LIKE '%attendance ' || p_attendance_id || '%'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_coach_session_expense(UUID) TO authenticated;
