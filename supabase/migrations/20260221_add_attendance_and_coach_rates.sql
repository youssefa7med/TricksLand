-- Add attendance_required field to sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS attendance_required BOOLEAN NOT NULL DEFAULT true;

-- Add attendance_marked_by_admin field to track admin manual marking
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS attendance_marked_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Add coach base rate system
-- Each coach has a base rate that increases 25% annually
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS base_hourly_rate NUMERIC(10, 2) CHECK (base_hourly_rate IS NULL OR base_hourly_rate > 0);

-- Track when the rate was set and when it should increase
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rate_effective_from DATE;

-- Track the next rate increase date (for 25% annual increase)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS next_rate_increase_date DATE;

COMMENT ON COLUMN profiles.base_hourly_rate IS 'Base hourly rate for the coach. Increases 25% annually.';
COMMENT ON COLUMN profiles.rate_effective_from IS 'Date when the current base rate became effective.';
COMMENT ON COLUMN profiles.next_rate_increase_date IS 'Date when the rate should increase by 25%.';

-- Function to get coach base rate with automatic 25% annual increase
CREATE OR REPLACE FUNCTION get_coach_base_rate(
    p_coach_id UUID,
    p_reference_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_base_rate NUMERIC;
    v_rate_effective_from DATE;
    v_next_increase DATE;
    v_years_passed NUMERIC;
    v_current_rate NUMERIC;
BEGIN
    -- Get coach's base rate and dates
    SELECT base_hourly_rate, rate_effective_from, next_rate_increase_date
    INTO v_base_rate, v_rate_effective_from, v_next_increase
    FROM profiles
    WHERE id = p_coach_id;
    
    -- If no base rate set, return NULL
    IF v_base_rate IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- If no effective date, use current date
    IF v_rate_effective_from IS NULL THEN
        v_rate_effective_from := CURRENT_DATE;
    END IF;
    
    -- Calculate years passed since rate was set
    v_years_passed := EXTRACT(YEAR FROM AGE(p_reference_date, v_rate_effective_from));
    
    -- Apply 25% increase for each full year
    v_current_rate := v_base_rate;
    FOR i IN 1..FLOOR(v_years_passed) LOOP
        v_current_rate := v_current_rate * 1.25;
    END LOOP;
    
    RETURN ROUND(v_current_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_hourly_rate function to check coach base rate as final fallback
CREATE OR REPLACE FUNCTION get_hourly_rate(
    p_course_id UUID,
    p_coach_id UUID,
    p_session_date DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
    v_course_name TEXT;
    v_coach_base_rate NUMERIC;
BEGIN
    -- Special case: If course name contains "competition", return 75
    SELECT name INTO v_course_name
    FROM courses
    WHERE id = p_course_id;
    
    IF v_course_name IS NOT NULL AND (
        LOWER(v_course_name) LIKE '%competition%' OR 
        LOWER(v_course_name) LIKE '%competetion%'
    ) THEN
        RETURN 75.00;
    END IF;
    
    -- Get the most recent rate effective on or before the session date
    -- for this specific course-coach combination
    SELECT rate INTO v_rate
    FROM hourly_rates
    WHERE course_id = p_course_id
      AND coach_id = p_coach_id
      AND effective_from <= p_session_date
    ORDER BY effective_from DESC
    LIMIT 1;
    
    -- If no course-coach rate found, check course default rate
    IF v_rate IS NULL THEN
        SELECT hourly_rate INTO v_rate
        FROM courses
        WHERE id = p_course_id;
    END IF;
    
    -- Final fallback: Use coach's base rate with annual increases
    IF v_rate IS NULL THEN
        v_coach_base_rate := get_coach_base_rate(p_coach_id, p_session_date);
        IF v_coach_base_rate IS NOT NULL THEN
            RETURN v_coach_base_rate;
        END IF;
    END IF;
    
    -- If still no rate found, return 0 (will cause validation errors)
    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
