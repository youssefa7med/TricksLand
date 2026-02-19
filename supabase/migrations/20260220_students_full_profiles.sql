-- ============================================================================
-- Students full profile system
-- ============================================================================

-- 1. Create global students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    phone TEXT,
    parent_phone TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_full_name ON students(full_name);

CREATE TRIGGER set_updated_at_students
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Migrate existing course_students names into the new students table
--    (deduplicate by full_name + created_by to avoid creating the same student twice)
INSERT INTO students (full_name, created_by, created_at)
SELECT DISTINCT ON (student_name, created_by)
    student_name,
    created_by,
    created_at
FROM course_students
ORDER BY student_name, created_by, created_at;

-- 3. Add student_id FK to course_students
ALTER TABLE course_students ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE;

-- 4. Link existing rows to the new students records (match on name + created_by)
UPDATE course_students cs
SET student_id = s.id
FROM students s
WHERE cs.student_name = s.full_name
  AND cs.created_by = s.created_by;

-- Fallback: match just by name if created_by doesn't match
UPDATE course_students cs
SET student_id = (
    SELECT id FROM students s WHERE s.full_name = cs.student_name LIMIT 1
)
WHERE cs.student_id IS NULL;

-- 5. Make student_id NOT NULL and add unique constraint
ALTER TABLE course_students ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE course_students ADD CONSTRAINT unique_course_student UNIQUE (course_id, student_id);

-- 6. Drop the now-redundant student_name column
ALTER TABLE course_students DROP COLUMN student_name;
ALTER TABLE course_students DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- RLS for students table
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all students"
    ON students FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view students in their courses"
    ON students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_students cs
            JOIN course_coaches cc ON cc.course_id = cs.course_id
            WHERE cs.student_id = students.id
              AND cc.coach_id = auth.uid()
        )
    );
