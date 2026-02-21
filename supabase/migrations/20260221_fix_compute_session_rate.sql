-- Fix: Restore compute_session_fields() to use get_hourly_rate() (hourly_rates table)
-- Problem: The 20260220_update_activity_functions migration replaced the trigger
-- function with get_activity_hourly_rate() which checks the 'activity_rates' table first.
-- That table exists but is EMPTY — no UI inserts into it. Rates are stored in
-- 'hourly_rates'. The fallback to hourly_rates was also failing likely due to RLS
-- restrictions inside the trigger context (not SECURITY DEFINER).
--
-- Fix: Make both rate-lookup functions SECURITY DEFINER so they can bypass RLS,
-- and restore compute_session_fields() to use get_hourly_rate() which is simpler
-- and directly reads from hourly_rates (where admin actually stores rates).

-- 1. Rebuild get_hourly_rate as SECURITY DEFINER so the trigger can always read
--    hourly_rates regardless of RLS policies.
CREATE OR REPLACE FUNCTION get_hourly_rate(
    p_course_id UUID,
    p_coach_id UUID,
    p_session_date DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    SELECT rate INTO v_rate
    FROM hourly_rates
    WHERE course_id = p_course_id
      AND coach_id  = p_coach_id
      AND effective_from <= p_session_date
    ORDER BY effective_from DESC
    LIMIT 1;

    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Rebuild get_activity_hourly_rate as SECURITY DEFINER too, with the same
--    fallback to hourly_rates (kept for forward-compat in case activity_rates
--    gets populated later).
CREATE OR REPLACE FUNCTION get_activity_hourly_rate(
    p_course_id    UUID,
    p_coach_id     UUID,
    p_activity_type session_type,
    p_session_date  DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    -- Check activity_rates first (per-activity overrides)
    SELECT hourly_rate INTO v_rate
    FROM activity_rates
    WHERE course_id    = p_course_id
      AND coach_id     = p_coach_id
      AND activity_type = p_activity_type
      AND effective_from <= p_session_date
    ORDER BY effective_from DESC
    LIMIT 1;

    -- Fall back to hourly_rates (the general per-course-coach rate)
    IF v_rate IS NULL THEN
        SELECT rate INTO v_rate
        FROM hourly_rates
        WHERE course_id   = p_course_id
          AND coach_id    = p_coach_id
          AND effective_from <= p_session_date
        ORDER BY effective_from DESC
        LIMIT 1;
    END IF;

    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Restore the trigger function to use get_hourly_rate() (reads from hourly_rates).
--    This is the table admins actually populate via the UI, so this is correct.
CREATE OR REPLACE FUNCTION compute_session_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_hours NUMERIC;
    v_rate  NUMERIC;
BEGIN
    -- Calculate duration in hours
    v_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;

    -- Look up the rate from hourly_rates (SECURITY DEFINER bypasses RLS)
    v_rate := get_hourly_rate(NEW.course_id, NEW.paid_coach_id, NEW.session_date);

    NEW.computed_hours := ROUND(v_hours, 2);
    NEW.applied_rate   := v_rate;
    NEW.subtotal       := ROUND(v_hours * v_rate, 2);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-create the trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS compute_session_fields_trigger ON sessions;

CREATE TRIGGER compute_session_fields_trigger
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION compute_session_fields();

-- 5. Back-fill existing sessions that have applied_rate = 0 or NULL
--    where a rate now exists in hourly_rates.
UPDATE sessions s
SET
    applied_rate = get_hourly_rate(s.course_id, s.paid_coach_id, s.session_date),
    subtotal     = ROUND(
                       s.computed_hours * get_hourly_rate(s.course_id, s.paid_coach_id, s.session_date),
                       2
                   )
WHERE (s.applied_rate IS NULL OR s.applied_rate = 0)
  AND EXISTS (
      SELECT 1 FROM hourly_rates hr
      WHERE hr.course_id = s.course_id
        AND hr.coach_id  = s.paid_coach_id
        AND hr.effective_from <= s.session_date
  );
