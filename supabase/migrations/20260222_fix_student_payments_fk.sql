-- Fix student_payments.student_id foreign key:
-- It incorrectly referenced profiles(id) but students are in the students table,
-- not in profiles (profiles = admin/coach auth users).

-- 1. Drop the incorrect FK constraint
ALTER TABLE public.student_payments
    DROP CONSTRAINT IF EXISTS student_payments_student_id_fkey;

-- 2. Re-add it pointing to students(id)
ALTER TABLE public.student_payments
    ADD CONSTRAINT student_payments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
