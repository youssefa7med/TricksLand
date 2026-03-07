-- ============================================================
-- CLEAR ALL STUDENTS
-- ⚠️  Deletes every row from:
--       students          (global student profiles)
--       course_students   (course enrolments)
--       student_attendance
--       student_payments
--       payment_transactions (linked to student payments)
-- ✅  Courses, sessions, coaches, admins are NOT touched.
-- ============================================================

SET session_replication_role = replica;   -- disable FK triggers

TRUNCATE TABLE public.payment_transactions  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.student_attendance    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.student_payments      RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.course_students       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.students              RESTART IDENTITY CASCADE;

SET session_replication_role = DEFAULT;   -- re-enable triggers

-- Verify
SELECT COUNT(*) AS remaining_students FROM public.students;
