-- ============================================================
-- Migration: fix created_by / marked_by / assigned_by FK constraints
-- Date: 2026-03-04
--
-- Problem:
--   Multiple tables have  created_by NOT NULL REFERENCES profiles(id)
--   with no ON DELETE action (defaults to RESTRICT).
--   Deleting an admin/coach user therefore fails with a FK violation
--   because their created_by rows block the cascade from auth.users
--   → profiles → child tables.
--
-- Fix:
--   1. Make the audit columns nullable (they can legitimately be NULL
--      after the creator is gone — data should survive user deletion).
--   2. Re-add the FK with ON DELETE SET NULL so deleting a profile
--      automatically clears the reference instead of raising an error.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- COURSES — created_by
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.courses
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.courses
    DROP CONSTRAINT IF EXISTS courses_created_by_fkey;

ALTER TABLE public.courses
    ADD CONSTRAINT courses_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- COURSE_COACHES — assigned_by
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.course_coaches
    ALTER COLUMN assigned_by DROP NOT NULL;

ALTER TABLE public.course_coaches
    DROP CONSTRAINT IF EXISTS course_coaches_assigned_by_fkey;

ALTER TABLE public.course_coaches
    ADD CONSTRAINT course_coaches_assigned_by_fkey
        FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- SESSIONS — created_by (if column exists)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
    ALTER TABLE public.sessions ALTER COLUMN created_by DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_created_by_fkey;
    ALTER TABLE public.sessions
        ADD CONSTRAINT sessions_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- COURSE_EXPENSES — created_by
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.course_expenses
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.course_expenses
    DROP CONSTRAINT IF EXISTS course_expenses_created_by_fkey;

ALTER TABLE public.course_expenses
    ADD CONSTRAINT course_expenses_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- STUDENT_PAYMENTS — created_by
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.student_payments
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.student_payments
    DROP CONSTRAINT IF EXISTS student_payments_created_by_fkey;

ALTER TABLE public.student_payments
    ADD CONSTRAINT student_payments_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- PAYMENT_TRANSACTIONS — created_by (if column exists)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
    ALTER TABLE public.payment_transactions ALTER COLUMN created_by DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_created_by_fkey;
    ALTER TABLE public.payment_transactions
        ADD CONSTRAINT payment_transactions_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- STUDENT_ATTENDANCE — marked_by
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.student_attendance
    ALTER COLUMN marked_by DROP NOT NULL;

ALTER TABLE public.student_attendance
    DROP CONSTRAINT IF EXISTS student_attendance_marked_by_fkey;

ALTER TABLE public.student_attendance
    ADD CONSTRAINT student_attendance_marked_by_fkey
        FOREIGN KEY (marked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- COURSE_FEE_ITEMS — created_by (if column exists)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
    ALTER TABLE public.course_fee_items ALTER COLUMN created_by DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.course_fee_items DROP CONSTRAINT IF EXISTS course_fee_items_created_by_fkey;
    ALTER TABLE public.course_fee_items
        ADD CONSTRAINT course_fee_items_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;
