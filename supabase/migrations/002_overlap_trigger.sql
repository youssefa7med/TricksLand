-- Overlap Prevention Trigger
-- Prevents two sessions for the same paid_coach_id from overlapping on the same date
-- Run this in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION prevent_session_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM sessions
        WHERE paid_coach_id = NEW.paid_coach_id
          AND session_date   = NEW.session_date
          AND id            <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
    ) THEN
        RAISE EXCEPTION 'Session overlaps with an existing session for this coach on this date';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_session_overlap ON sessions;

CREATE TRIGGER check_session_overlap
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION prevent_session_overlap();
