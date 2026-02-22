-- ============================================================
-- Fix 1: student_attendance.student_id FK → students(id) 
--        (was wrongly referencing profiles(id))
-- ============================================================

-- Drop the wrong FK constraint (name varies — try both common names)
ALTER TABLE public.student_attendance
    DROP CONSTRAINT IF EXISTS student_attendance_student_id_fkey;

-- Add the correct FK pointing to the standalone students table
ALTER TABLE public.student_attendance
    ADD CONSTRAINT student_attendance_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- ============================================================
-- Fix 2: student_monthly_attendance view
--        was JOIN profiles → must be JOIN students
-- ============================================================

DROP VIEW IF EXISTS public.student_monthly_attendance;
CREATE VIEW public.student_monthly_attendance
WITH (security_invoker = true)
AS
SELECT
    sa.student_id,
    st.full_name                                    AS student_name,
    sa.course_id,
    c.name                                          AS course_name,
    TO_CHAR(sa.attendance_date, 'YYYY-MM')          AS month,
    COUNT(*)                                        AS total_sessions,
    COUNT(CASE WHEN sa.status = 'present' THEN 1 END) AS sessions_attended,
    COUNT(CASE WHEN sa.status = 'absent'  THEN 1 END) AS sessions_absent,
    COUNT(CASE WHEN sa.status = 'late'    THEN 1 END) AS sessions_late,
    ROUND(
        100.0 * COUNT(CASE WHEN sa.status = 'present' THEN 1 END)
        / NULLIF(COUNT(*), 0),
        2
    )                                               AS attendance_percentage
FROM   student_attendance sa
JOIN   students  st ON sa.student_id  = st.id
JOIN   courses    c ON sa.course_id   = c.id
GROUP BY
    sa.student_id, st.full_name,
    sa.course_id,  c.name,
    TO_CHAR(sa.attendance_date, 'YYYY-MM');

SELECT 'student_attendance FK + view fixed successfully!' AS result;
