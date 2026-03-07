-- ============================================================
-- SEED: 9 students from registration forms (Google Forms data)
-- Source: form submissions Sep–Nov 2025
-- DOB not available — age stored in notes; update DOB when known.
-- ⚠️  زياد محمود فهمي appeared twice (duplicate submission) → inserted once.
-- ⚠️  سليم & سلمى أحمد صلاح share parent contact phone but different whatsapp.
--     parent_phone = contact number, phone = whatsapp stored in notes.
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
        --  ─── Sep 21, 2025 ───────────────────────────────────────────────
        ('زياد محمود فهمي',           '01007977288',
         'عمر: ٩ | مدرسة الدعوة الإسلامية الابتدائية | ولي الأمر: محمود فهمي رياض | اهتمام: WeDo 2.0 | سبق: Scratch 3',
         v_admin_id),

        ('فيروز محمود فهمي',          '01007977288',
         'عمر: ٧ | مدرسة الدعوة الإسلامية الابتدائية | ولي الأمر: أسماء محمد سمير | اهتمام: WeDo 2.0',
         v_admin_id),

        --  ─── Sep 24, 2025 ───────────────────────────────────────────────
        ('سليم أحمد صلاح',            '01204425193',
         'عمر: ١٢ | مدرسة التوفيق | ولي الأمر: شيماء خليفة | واتساب: 01551777819 | اهتمام: EV3',
         v_admin_id),

        ('سلمى أحمد صلاح',            '01204425193',
         'عمر: ١٢ | مدرسة التوفيق | ولي الأمر: شيماء خليفة | واتساب: 01551777819 | اهتمام: EV3',
         v_admin_id),

        --  ─── Sep 25, 2025 ───────────────────────────────────────────────
        ('بسملة حمادة محمد',          '01018070582',
         'عمر: ١٦ | المدرسة الثانوية بنات | ولي الأمر: بسمة محمد علي مرزوق | اهتمام: دبلومة Arduino',
         v_admin_id),

        --  ─── Oct 6, 2025 ────────────────────────────────────────────────
        ('ميرا ميلاد عزيز',           '01004252677',
         'عمر: ٩ | مدرسة الراهبات | ولي الأمر: ميلاد عزيز | اهتمام: WeDo 2.0',
         v_admin_id),

        --  ─── Nov 2, 2025 ────────────────────────────────────────────────
        ('بيلان محمد إبراهيم يوسف',   '01204425196',
         'عمر: ١٠ | مدرسة الديوان | ولي الأمر: مروة حاتم حسن عابدين | اهتمام: EV3',
         v_admin_id),

        --  ─── Nov 3, 2025 ────────────────────────────────────────────────
        ('آسر محمد رمضان',            '01118178664',
         'عمر: ١٠ | مدرسة Diwan | ولي الأمر: محمد رمضان محمد | اهتمام: WeDo 2.0',
         v_admin_id),

        ('بيسان محمد رمضان',          '01118178664',
         'عمر: ٩ | مدرسة Diwan | ولي الأمر: محمد رمضان محمد | اهتمام: WeDo 2.0',
         v_admin_id)

    ON CONFLICT DO NOTHING;

END $$;

-- Verify
SELECT full_name, parent_phone, notes
FROM public.students
WHERE parent_phone IN (
    '01007977288','01204425193','01018070582',
    '01004252677','01204425196','01118178664'
)
ORDER BY full_name;
