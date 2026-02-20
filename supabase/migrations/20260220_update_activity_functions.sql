-- Update database functions to support activity-based rates
-- This migration adds support for different rates based on activity type

-- Create new function to get hourly rate based on activity type
CREATE OR REPLACE FUNCTION get_activity_hourly_rate(
    p_course_id UUID,
    p_coach_id UUID,
    p_activity_type session_type,
    p_session_date DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    -- Try to get rate from activity_rates table first
    SELECT hourly_rate INTO v_rate
    FROM activity_rates
    WHERE course_id = p_course_id
      AND coach_id = p_coach_id
      AND activity_type = p_activity_type
      AND effective_from <= p_session_date
    ORDER BY effective_from DESC
    LIMIT 1;
    
    -- If no specific activity rate found, fall back to hourly_rates table
    IF v_rate IS NULL THEN
        SELECT rate INTO v_rate
        FROM hourly_rates
        WHERE course_id = p_course_id
          AND coach_id = p_coach_id
          AND effective_from <= p_session_date
        ORDER BY effective_from DESC
        LIMIT 1;
    END IF;
    
    -- If still no rate found, return 0
    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Keep backward compatibility: Keep old get_hourly_rate function
-- This ensures existing code continues to work
-- Old function behavior: uses hourly_rates table only

-- Update compute_session_fields trigger to use new activity-aware rate lookup
CREATE OR REPLACE FUNCTION compute_session_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_hours NUMERIC;
    v_rate NUMERIC;
BEGIN
    -- Calculate hours (end_time - start_time)
    v_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;
    
    -- Get the correct rate based on course + coach + activity_type
    -- This will check activity_rates first, then fall back to hourly_rates
    v_rate := get_activity_hourly_rate(
        NEW.course_id, 
        NEW.paid_coach_id, 
        NEW.session_type,
        NEW.session_date
    );
    
    -- Set computed fields
    NEW.computed_hours := ROUND(v_hours, 2);
    NEW.applied_rate := v_rate;
    NEW.subtotal := ROUND(v_hours * v_rate, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify that sessions table exists and is compatible
-- Note: The sessions table should have session_type column
-- If you get an error here about session_type not existing,
-- ensure the initial_schema.sql migration was applied first
