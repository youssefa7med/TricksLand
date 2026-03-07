-- ============================================================
-- SEED: 3 students — Batch D (Google Form Oct 2025)
-- New file per batch → safe to copy & run independently.
-- Uses WHERE NOT EXISTS → ZERO duplicates if run multiple times.
--
-- ⚠️  مروان محمد حجاج  — name already exists in previous batch
--     with a different phone (01282364413). This entry has
--     phone 01113717787 and school Diwan Language School.
--     If it's the same person, skip this row manually.
--     If different person, rename one of them before running.
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin profile found. Create an admin account first.';
    END IF;

    INSERT INTO public.students (full_name, parent_phone, notes, created_by)
    SELECT full_name, parent_phone, notes, v_admin_id
    FROM (VALUES
        ('مروان محمد حجاج',          '01113717787', 'عمر: ٦ | مدرسة Diwan Language School | ولي الأمر: Mohamed Haggag | اهتمام: برمجة'),
        ('حسن ماجد احمد',            '01027843927', 'عمر: ١٣ | مدرسة صلاح الدين | ولي الأمر: رنا حسن احمد | سبق: نعم'),
        ('عبدالرحمن يوسف محمد',      '01098673628', 'عمر: ١٨ | مدرسة Saint Mark | ولي الأمر: Yousef Mohamed Ahmed')
    ) AS t(full_name, parent_phone, notes)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.students s WHERE s.full_name = t.full_name
    );

END $$;

-- Verify
SELECT full_name, parent_phone, notes
FROM public.students
WHERE full_name IN ('مروان محمد حجاج', 'حسن ماجد احمد', 'عبدالرحمن يوسف محمد')
ORDER BY full_name;
