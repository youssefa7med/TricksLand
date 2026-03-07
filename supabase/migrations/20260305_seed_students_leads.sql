-- ============================================================
-- SEED: 27 additional students / leads
-- All phone numbers stored as parent_phone in format 01XXXXXXXXX
-- Notes column used for context where the name had extra info
--
-- ⚠️  لينه و بتول  → split into TWO students, same parent phone
-- ⚠️  Some entries had no student name (parent inquiry notes) —
--     name used is the best available identifier; update later.
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
    VALUES
        -- +20 1XX → 01X format, spaces removed
        ('لارا',                       '01002058334', NULL,                                    v_admin_id),
        ('عمر احمد سعيد',              '01552025789', NULL,                                    v_admin_id),
        ('معتصم',                      '01067747050', NULL,                                    v_admin_id),
        ('عمر احمد',                   '01021611154', NULL,                                    v_admin_id),
        ('الحسين',                     '01066934228', NULL,                                    v_admin_id),
        ('عبد الرحمن',                 '01090902497', NULL,                                    v_admin_id),
        ('طالب - أم سلمي',             '01207552279', 'أم سألت عن كورس لطفل عمره ٧ سنوات',   v_admin_id),
        ('احمد حسام',                  '01110456077', NULL,                                    v_admin_id),
        ('اسيل ياسر سيد',              '01030221444', NULL,                                    v_admin_id),
        ('آدم محمد حاتم',              '01016865092', 'عمره ٧ سنين',                           v_admin_id),
        ('عمر رامي',                   '01002924490', NULL,                                    v_admin_id),
        ('طالب - أ. آية حافظ',         '01029988263', 'أم مهتمة بكورسات الروبوت',             v_admin_id),
        ('طالب - أ. ساره صابر',        '01001659235', 'أم سألت عن كورسات لطفل عمره ٧ سنوات', v_admin_id),
        ('طالب - ولي أمر',             '01009113205', 'أم مهتمة بكورسات الروبوت، عمر الابن ٩ سنوات', v_admin_id),
        ('فيرزو طارق احمد',            '01115773003', NULL,                                    v_admin_id),
        ('لوحين وليان عمرو رجب',       '01064535970', NULL,                                    v_admin_id),
        ('منه الله مخلص',              '01009158403', NULL,                                    v_admin_id),
        ('عائشة حازم',                 '01110479339', NULL,                                    v_admin_id),
        ('حمزة احمد علي محمود',        '01017010926', NULL,                                    v_admin_id),
        ('مروان محمد حجاج',            '01282364413', NULL,                                    v_admin_id),
        ('شريف برهان',                 '01009113205', 'كان قد ملأ فورم مسبقاً',               v_admin_id),
        ('سليم محمد وجيه',             '01200252048', NULL,                                    v_admin_id),
        ('فارس احمد جابر',             '01010384624', NULL,                                    v_admin_id),
        ('يحيي احمد فواد',             '01028061040', NULL,                                    v_admin_id),
        ('لينة',                       '01150166761', NULL,                                    v_admin_id),  -- shared parent phone with بتول
        ('بتول',                       '01150166761', NULL,                                    v_admin_id),  -- shared parent phone with لينة
        ('سارة محمد اسامه',            '01009756100', NULL,                                    v_admin_id),
        ('حور احمد',                   '01005895500', NULL,                                    v_admin_id)
    ON CONFLICT DO NOTHING;

END $$;

-- Verify newly inserted
SELECT full_name, parent_phone, notes
FROM public.students
WHERE parent_phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 30;
