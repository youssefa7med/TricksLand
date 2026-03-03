-- ============================================================
-- FULL DATA RESET SCRIPT
-- ⚠️  THIS DELETES ALL APPLICATION DATA — SCHEMA IS PRESERVED
-- ⚠️  Run in Supabase SQL Editor
-- ⚠️  Auth users (auth.users) must be deleted separately via
--     Supabase Dashboard → Authentication → Users
-- ============================================================

-- Disable triggers temporarily so truncate doesn't fire expense triggers etc.
SET session_replication_role = replica;

-- ─────────────────────────────────────────────────────────────
-- LEAF / most-dependent tables first (no children)
-- ─────────────────────────────────────────────────────────────
TRUNCATE TABLE public.payment_transactions     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.student_attendance       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.course_expenses          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.course_fee_items         RESTART IDENTITY CASCADE;  -- cascades → student_payments rows with fee_item_id
TRUNCATE TABLE public.student_payments         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.coach_attendance         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.adjustments              RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.course_schedules         RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Mid-level: sessions + coach rates
-- ─────────────────────────────────────────────────────────────
TRUNCATE TABLE public.sessions                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.hourly_rates             RESTART IDENTITY CASCADE;
-- course_coach_rates may not exist in all deployments — skip safely
DO $$ BEGIN
    TRUNCATE TABLE public.course_coach_rates RESTART IDENTITY CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- Course-level: students, coaches assignments, then courses
-- ─────────────────────────────────────────────────────────────
TRUNCATE TABLE public.course_students          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.course_coaches           RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.courses                  RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Profiles (linked to auth.users — deleting here is safe;
-- the auth.users rows stay until you delete them in the dashboard)
-- ─────────────────────────────────────────────────────────────
TRUNCATE TABLE public.profiles                 RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Admin settings: restore defaults after clearing
-- Comment this block out if you want to KEEP your settings.
-- ─────────────────────────────────────────────────────────────
TRUNCATE TABLE public.admin_settings           RESTART IDENTITY CASCADE;

INSERT INTO public.admin_settings (key, value, value_type, description, is_public)
VALUES
    ('geolocation_radius_meters', '60',  'integer', 'Allowed radius for attendance check-in in meters', false),
    ('quarter_hour_increment',    '15',  'integer', 'Billing increment in minutes', false)
ON CONFLICT (key) DO NOTHING;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ─────────────────────────────────────────────────────────────
-- Verification: row counts should all be 0 (except admin_settings)
-- ─────────────────────────────────────────────────────────────
SELECT
    'profiles'            AS "table", COUNT(*) AS rows FROM public.profiles            UNION ALL
SELECT 'courses',                              COUNT(*) FROM public.courses             UNION ALL
SELECT 'course_coaches',                       COUNT(*) FROM public.course_coaches      UNION ALL
SELECT 'course_students',                      COUNT(*) FROM public.course_students     UNION ALL
SELECT 'course_fee_items',                     COUNT(*) FROM public.course_fee_items    UNION ALL
SELECT 'course_schedules',                     COUNT(*) FROM public.course_schedules    UNION ALL
SELECT 'sessions',                             COUNT(*) FROM public.sessions            UNION ALL
SELECT 'hourly_rates',                         COUNT(*) FROM public.hourly_rates        UNION ALL
SELECT 'coach_attendance',                     COUNT(*) FROM public.coach_attendance    UNION ALL
SELECT 'student_attendance',                   COUNT(*) FROM public.student_attendance  UNION ALL
SELECT 'student_payments',                     COUNT(*) FROM public.student_payments    UNION ALL
SELECT 'payment_transactions',                 COUNT(*) FROM public.payment_transactions UNION ALL
SELECT 'course_expenses',                      COUNT(*) FROM public.course_expenses     UNION ALL
SELECT 'adjustments',                          COUNT(*) FROM public.adjustments         UNION ALL
SELECT 'admin_settings (defaults restored)',   COUNT(*) FROM public.admin_settings
ORDER BY 1;
