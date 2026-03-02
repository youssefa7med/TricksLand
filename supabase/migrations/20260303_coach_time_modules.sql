-- ============================================================================
-- COACH TIME CALCULATION USING 15-MINUTE MODULES
-- Date: 2026-03-03
--
-- Business Rules:
--   • duration_in_minutes = leaving_time − arrival_time
--   • completed_modules   = FLOOR(duration_in_minutes / 15)
--   • billed_hours        = completed_modules × 0.25
--   • If duration < 15 min → billed_hours = 0
--   • Do NOT round up — partial modules are ignored
--
-- What this migration adds:
--   1. arrival_time, leaving_time, duration_minutes, billed_hours
--      columns on coach_attendance
--   2. calculate_coach_billed_hours() SQL function (IMMUTABLE, FLOOR-based)
--   3. Trigger to auto-compute duration_minutes & billed_hours on coach_attendance
--   4. Refreshed coach_monthly_totals view with total_billed_hours +
--      billed_gross_total + net_billed_total columns
-- ============================================================================


-- ============================================================================
-- STEP 1 – Add time-tracking columns to coach_attendance
-- ============================================================================

ALTER TABLE coach_attendance
    ADD COLUMN IF NOT EXISTS arrival_time     TIME,
    ADD COLUMN IF NOT EXISTS leaving_time     TIME,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS billed_hours     NUMERIC(5, 2);

COMMENT ON COLUMN coach_attendance.arrival_time     IS 'Coach actual arrival time at the session.';
COMMENT ON COLUMN coach_attendance.leaving_time     IS 'Coach actual departure time from the session.';
COMMENT ON COLUMN coach_attendance.duration_minutes IS 'Actual time spent at the session in minutes (leaving_time − arrival_time).';
COMMENT ON COLUMN coach_attendance.billed_hours     IS
    'Billable hours using strict 15-minute modules: FLOOR(duration_minutes / 15) × 0.25. '
    'Partial modules are never billed. Null when arrival/leaving not yet recorded.';


-- ============================================================================
-- STEP 2 – calculate_coach_billed_hours()
--
-- Implements the 15-minute module formula exactly as specified:
--   completed_modules = FLOOR(duration_in_minutes / 15)
--   billed_hours      = completed_modules × 0.25
--
-- Returns NULL if either time argument is NULL.
-- Returns 0   if duration is less than 15 minutes.
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_coach_billed_hours(
    p_arrival_time TIME,
    p_leaving_time TIME
)
RETURNS NUMERIC AS $$
DECLARE
    v_duration_minutes  INTEGER;
    v_completed_modules INTEGER;
BEGIN
    -- Guard: both times must be present
    IF p_arrival_time IS NULL OR p_leaving_time IS NULL THEN
        RETURN NULL;
    END IF;

    -- duration in whole minutes (integer division truncates automatically)
    v_duration_minutes := EXTRACT(EPOCH FROM (p_leaving_time - p_arrival_time))::INTEGER / 60;

    -- Rule: less than one full module → no billing
    IF v_duration_minutes < 15 THEN
        RETURN 0;
    END IF;

    -- Completed 15-minute modules (FLOOR — do NOT round up)
    v_completed_modules := FLOOR(v_duration_minutes::NUMERIC / 15)::INTEGER;

    -- Each completed module = 0.25 hours
    RETURN v_completed_modules * 0.25;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_coach_billed_hours(TIME, TIME) IS
    'Calculate coach billed hours using strict 15-minute modules. '
    'Formula: FLOOR(duration_minutes / 15) × 0.25. '
    'Never rounds up — partial modules are ignored. '
    'Returns NULL if either argument is NULL, 0 if duration < 15 min.';


-- ============================================================================
-- STEP 3 – Trigger: auto-compute duration_minutes & billed_hours on INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_coach_attendance_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.arrival_time IS NOT NULL AND NEW.leaving_time IS NOT NULL THEN
        -- Raw duration
        NEW.duration_minutes :=
            EXTRACT(EPOCH FROM (NEW.leaving_time - NEW.arrival_time))::INTEGER / 60;

        -- Billed hours via strict 15-minute module rule
        NEW.billed_hours :=
            calculate_coach_billed_hours(NEW.arrival_time, NEW.leaving_time);
    ELSE
        -- Times not (yet) recorded — clear computed fields
        NEW.duration_minutes := NULL;
        NEW.billed_hours     := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compute_coach_attendance_time ON coach_attendance;

CREATE TRIGGER trigger_compute_coach_attendance_time
    BEFORE INSERT OR UPDATE ON coach_attendance
    FOR EACH ROW
    EXECUTE FUNCTION compute_coach_attendance_time();


-- ============================================================================
-- STEP 4 – Backfill: clear computed columns where times are absent
--   (Rows inserted before this migration have NULL times; set both computed
--    columns to NULL so they are consistent with the new trigger logic.)
-- ============================================================================

UPDATE coach_attendance
SET
    duration_minutes = NULL,
    billed_hours     = NULL
WHERE arrival_time IS NULL
   OR leaving_time IS NULL;


-- ============================================================================
-- STEP 5 – Refresh coach_monthly_totals view
--
-- Adds three new columns alongside the existing ones (no breaking changes):
--   • total_billed_hours  – SUM of billed_hours from coach_attendance per month
--   • billed_gross_total  – total pay using billed_hours × applied_rate
--                           (falls back to session subtotal when not recorded)
--   • net_billed_total    – billed_gross_total + bonuses − discounts
--
-- The original columns (total_hours, gross_total, net_total) are preserved
-- so existing reports & queries continue to work unchanged.
--
-- NOTE: DROP CASCADE is required because Supabase holds a GRANT on the view
-- which creates a dependency that prevents a plain DROP without CASCADE.
-- ============================================================================

DROP VIEW IF EXISTS public.coach_monthly_totals CASCADE;

CREATE VIEW public.coach_monthly_totals
WITH (security_invoker = true)
AS
SELECT
    s.paid_coach_id                             AS coach_id,
    p.full_name                                 AS coach_name,
    TO_CHAR(s.session_date, 'YYYY-MM')          AS month,

    -- ── session counts ────────────────────────────────────────────────────
    COUNT(*)                                    AS session_count,

    -- ── scheduled hours (session start→end, original behaviour) ──────────
    SUM(s.computed_hours)                       AS total_hours,

    -- ── actual billed hours (15-min module rule) ──────────────────────────
    -- NULL when arrival/leaving not yet recorded for any session in the month
    SUM(ca.billed_hours)                        AS total_billed_hours,

    -- ── earnings (session-time-based, original behaviour) ────────────────
    SUM(s.subtotal)                             AS gross_total,

    -- ── earnings (billed-hours-based) ────────────────────────────────────
    -- Uses billed_hours × rate when coach arrival/leaving is recorded,
    -- otherwise falls back to the session subtotal unchanged.
    SUM(
        CASE
            WHEN ca.billed_hours IS NOT NULL
            THEN ROUND(ca.billed_hours * COALESCE(s.applied_rate, 0), 2)
            ELSE COALESCE(s.subtotal, 0)
        END
    )                                           AS billed_gross_total,

    -- ── adjustments ───────────────────────────────────────────────────────
    COALESCE(adj.total_bonuses,   0)            AS total_bonuses,
    COALESCE(adj.total_discounts, 0)            AS total_discounts,

    -- ── net totals ────────────────────────────────────────────────────────
    -- Original net (session-time-based)
    SUM(s.subtotal)
        + COALESCE(adj.total_bonuses,   0)
        - COALESCE(adj.total_discounts, 0)      AS net_total,

    -- Billed net (15-min module billed hours × rate where available)
    SUM(
        CASE
            WHEN ca.billed_hours IS NOT NULL
            THEN ROUND(ca.billed_hours * COALESCE(s.applied_rate, 0), 2)
            ELSE COALESCE(s.subtotal, 0)
        END
    )
        + COALESCE(adj.total_bonuses,   0)
        - COALESCE(adj.total_discounts, 0)      AS net_billed_total

FROM sessions s
INNER JOIN profiles p
    ON p.id = s.paid_coach_id

-- Bring in billed_hours per session per coach (NULL when not recorded)
LEFT JOIN coach_attendance ca
    ON  ca.coach_id   = s.paid_coach_id
    AND ca.session_id = s.id

-- Pre-aggregated adjustments to avoid row multiplication
LEFT JOIN (
    SELECT
        coach_id,
        month,
        SUM(CASE WHEN type = 'bonus'    THEN amount ELSE 0 END) AS total_bonuses,
        SUM(CASE WHEN type = 'discount' THEN amount ELSE 0 END) AS total_discounts
    FROM adjustments
    GROUP BY coach_id, month
) adj
    ON  adj.coach_id = s.paid_coach_id
    AND adj.month    = TO_CHAR(s.session_date, 'YYYY-MM')

GROUP BY
    s.paid_coach_id,
    p.full_name,
    TO_CHAR(s.session_date, 'YYYY-MM'),
    adj.total_bonuses,
    adj.total_discounts;

COMMENT ON VIEW coach_monthly_totals IS
    'Monthly payroll summary per coach. '
    'total_billed_hours / billed_gross_total / net_billed_total use the '
    '15-minute module rule (FLOOR) when coach arrival/leaving times are recorded. '
    'total_hours / gross_total / net_total retain the original session-time-based values.';

-- Restore the grant that CASCADE dropped
GRANT SELECT ON public.coach_monthly_totals TO authenticated;


-- ============================================================================
-- VERIFICATION EXAMPLES (run manually to confirm the logic)
-- ============================================================================
--
-- SELECT calculate_coach_billed_hours('09:00', '09:10');  -- → 0      (10 min  < 15)
-- SELECT calculate_coach_billed_hours('09:00', '09:15');  -- → 0.25   (15 min  = 1 module)
-- SELECT calculate_coach_billed_hours('09:00', '09:16');  -- → 0.25   (16 min  = 1 module)
-- SELECT calculate_coach_billed_hours('09:00', '09:29');  -- → 0.25   (29 min  = 1 module)
-- SELECT calculate_coach_billed_hours('09:00', '09:30');  -- → 0.5    (30 min  = 2 modules)
-- SELECT calculate_coach_billed_hours('09:00', '09:44');  -- → 0.5    (44 min  = 2 modules)
-- SELECT calculate_coach_billed_hours('09:00', '09:45');  -- → 0.75   (45 min  = 3 modules)
-- SELECT calculate_coach_billed_hours('09:00', '10:00');  -- → 1.0    (60 min  = 4 modules)
-- SELECT calculate_coach_billed_hours('09:00', '10:01');  -- → 1.0    (61 min  = 4 modules)
-- SELECT calculate_coach_billed_hours('09:00', '10:15');  -- → 1.25   (75 min  = 5 modules)
