-- Migration: Allow session fields to be recalculated when rates are added/updated
-- This ensures that adding a rate after a session is logged will trigger recalculation

-- Drop the existing trigger (it only triggers on INSERT)
DROP TRIGGER IF EXISTS compute_session_fields_trigger ON sessions;

-- Create a new trigger that runs on both INSERT and UPDATE
-- This allows rate recalculation when rates are added after session creation
CREATE TRIGGER compute_session_fields_trigger
BEFORE INSERT OR UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION compute_session_fields();

-- Function to manually recalculate all sessions for a coach/course/month
-- Useful if rates are added retroactively
CREATE OR REPLACE FUNCTION recalculate_session_rates(
    p_coach_id UUID,
    p_course_id UUID,
    p_month TEXT  -- Format: YYYY-MM
) RETURNS TABLE (
    session_id UUID,
    old_rate NUMERIC,
    new_rate NUMERIC,
    updated BOOLEAN
) AS $$
DECLARE
    v_session RECORD;
    v_new_rate NUMERIC;
    v_first_day DATE;
    v_last_day DATE;
BEGIN
    -- Parse the month to get date range
    v_first_day := (p_month || '-01')::DATE;
    v_last_day := (v_first_day + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Iterate through all sessions in the given month for this coach/course
    FOR v_session IN
        SELECT id, applied_rate, session_date, paid_coach_id
        FROM sessions
        WHERE paid_coach_id = p_coach_id
          AND course_id = p_course_id
          AND session_date >= v_first_day
          AND session_date <= v_last_day
    LOOP
        -- Get the correct rate for this session
        v_new_rate := get_hourly_rate(p_course_id, p_coach_id, v_session.session_date);
        
        -- If rate is different, update the session
        IF v_new_rate != v_session.applied_rate THEN
            UPDATE sessions
            SET applied_rate = v_new_rate,
                subtotal = ROUND(computed_hours * v_new_rate, 2)
            WHERE id = v_session.id;
            
            RETURN QUERY SELECT v_session.id, v_session.applied_rate, v_new_rate, TRUE;
        ELSE
            RETURN QUERY SELECT v_session.id, v_session.applied_rate, v_new_rate, FALSE;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
