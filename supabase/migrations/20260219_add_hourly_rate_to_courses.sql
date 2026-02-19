-- Add default hourly rate to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) CHECK (hourly_rate IS NULL OR hourly_rate > 0);

COMMENT ON COLUMN courses.hourly_rate IS 'Default hourly rate (EGP/hr) for this course. Used as a base rate reference.';
