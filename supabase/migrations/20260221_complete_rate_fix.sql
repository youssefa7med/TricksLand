-- ============================================================================
-- COMPLETE RATE FIX
-- Problem: compute_session_fields() trigger only reads hourly_rates,
-- returning 0 if no row found. Full fallback chain was never applied in trigger.
-- Fix: Rebuild get_hourly_rate() with complete fallback + make trigger use it.
-- ============================================================================

-- Step 1: Create the complete rate resolver as SECURITY DEFINER
--   Priority: hourly_rates > course.hourly_rate > competition=75 > coach base rate

CREATE OR REPLACE FUNCTION get_hourly_rate(
    p_course_id UUID,
    p_coach_id UUID,
    p_session_date DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate            NUMERIC;
    v_course_name     TEXT;
    v_base_rate       NUMERIC;
    v_effective_from  DATE;
    v_years_passed    INT;
BEGIN
    -- 1) Check hourly_rates table (course + coach specific)
    SELECT rate INTO v_rate
    FROM hourly_rates
    WHERE course_id       = p_course_id
      AND coach_id        = p_coach_id
      AND effective_from <= p_session_date
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_rate IS NOT NULL AND v_rate > 0 THEN
        RETURN v_rate;
    END IF;

    -- 2) Competition course → fixed 75 EGP
    SELECT name INTO v_course_name
    FROM courses
    WHERE id = p_course_id;

    IF v_course_name IS NOT NULL AND (
        LOWER(v_course_name) LIKE '%competition%' OR
        LOWER(v_course_name) LIKE '%competetion%'
    ) THEN
        RETURN 75.00;
    END IF;

    -- 3) Course default hourly_rate
    SELECT hourly_rate INTO v_rate
    FROM courses
    WHERE id = p_course_id;

    IF v_rate IS NOT NULL AND v_rate > 0 THEN
        RETURN v_rate;
    END IF;

    -- 4) Coach base rate with 25% annual increase
    SELECT base_hourly_rate, rate_effective_from
    INTO v_base_rate, v_effective_from
    FROM profiles
    WHERE id = p_coach_id;

    IF v_base_rate IS NOT NULL AND v_base_rate > 0 THEN
        IF v_effective_from IS NULL THEN
            v_effective_from := p_session_date;
        END IF;
        v_years_passed := EXTRACT(YEAR FROM AGE(p_session_date, v_effective_from))::INT;
        -- Apply 25% compound increase per full year
        FOR i IN 1..GREATEST(v_years_passed, 0) LOOP
            v_base_rate := v_base_rate * 1.25;
        END LOOP;
        RETURN ROUND(v_base_rate, 2);
    END IF;

    -- 5) No rate found – return NULL (not 0) so caller can decide
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 2: Update compute_session_fields() trigger to use complete chain
CREATE OR REPLACE FUNCTION compute_session_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_hours NUMERIC;
    v_rate  NUMERIC;
BEGIN
    v_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;
    v_rate  := get_hourly_rate(NEW.course_id, NEW.paid_coach_id, NEW.session_date);

    NEW.computed_hours := ROUND(v_hours, 2);
    NEW.applied_rate   := COALESCE(v_rate, 0);
    NEW.subtotal       := ROUND(v_hours * COALESCE(v_rate, 0), 2);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Re-create trigger (DROP + CREATE to avoid duplicates)
DROP TRIGGER IF EXISTS compute_session_fields_trigger ON sessions;

CREATE TRIGGER compute_session_fields_trigger
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION compute_session_fields();

-- Step 4: Backfill ALL sessions where applied_rate is NULL or 0
UPDATE sessions s
SET
    applied_rate = COALESCE(get_hourly_rate(s.course_id, s.paid_coach_id, s.session_date), 0),
    subtotal     = ROUND(
                       s.computed_hours * COALESCE(get_hourly_rate(s.course_id, s.paid_coach_id, s.session_date), 0),
                       2
                   )
WHERE s.applied_rate IS NULL OR s.applied_rate = 0;
