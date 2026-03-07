-- ============================================================
-- Batch F: Multi-source students (Oct 2024 – Mar 2026)
-- Sections:
--   1. Registration Forms (Oct 2024 – Jan 2026) — ~35 students
--   2. Competition Records (May 2025)           — ~22 students
--   3. Event/Competition Records (Aug–Dec 2025) — ~20 students
--   4. Phone-book entries (2023–2026)           — ~14 students
--
-- DEDUPLICATION DECISIONS (SKIPPED):
--   - عبدالرحمن أحمد حلمي عيد     = AbdElRahman Ahmed Helmy      (Batch E)
--   - أسامة أحمد محسن              = Osama Ahmed Mohsen            (Batch E)
--   - حسن ماجد احمد               = Batch D
--   - ياسين وائل محمود             = Yassin Wael Mahmoud           (Batch E)
--   - إياد أيمن لطفي               = Eyad Ayman Lotfy              (Batch E)
--   - ريتال محمد السيد             = Retal Mohamed Elsayed         (Batch E)
--   - آدم محمود طه                 = Adam Mahmoud Taha             (Batch E)
--   - عمر صالح محمد / أنس علاء الدين = Batch E
--   - عبدالرحمن مصطفى / Abdelrhman Mostafa Abdelwhab = Batch E
--   - عمر احمد سعيد عبد الستار    = عمر احمد سعيد (Batch B) — same phone 01552025789
--   - يحيى ياسر سيد               = Yahia Yasser Sayed            (Batch E)
--   - عبدالرحمن يونس              = يونس عبد الرحمن يونس           (Batch A)
--   - All Batch-A core names       = already seeded
--   - Same-person duplicate submissions kept once (آدم وليد مصطفي ×3, تسنيم ×2, ساهر سامح عرفة reversed)
--
-- WARNINGS (potential near-matches, added anyway with comment):
--   - معاذ محمد مصطفي أنور        ⚠️ suffix 'أنور' differs from معاذ محمد مصطفى (Batch A)
--   - لارا عبد الرحمن محمد        ⚠️ may match لارا (Batch B – no last name stored)
--   - لينة عاطف عزالعرب محمد      ⚠️ may match لينة (Batch B – no last name stored)
--   - زياد                         ⚠️ may match زياد محمود فهمي (Batch C)
--   - آسر احمد                     ⚠️ different family from آسر محمد رمضان (Batch C)
--   - إياد محمد علاء               ⚠️ different from Eyad Ayman Lotfy (Batch E)
--   - جودي محمد ممدوح علي         ⚠️ different from جودي محمد طاهر (Batch A)
--   - تالين وائل احمد عبدالله     ⚠️ sibling of محمد وائل أحمد / مالك وائل أحمد (Batch A)
--   - إياد باهر                    ⚠️ sibling of آدم بحر محمد (Batch A)
--   - أنس حسن الدين علاء          ⚠️ may be sibling of أنس علاء الدين (Batch E) – different parent chain
--   - عبدالرحمن (first name only)  ⚠️ no family name provided
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

  -- ─────────────────────────────────────────────────────────────
  -- SECTION 1 · Registration Forms (Oct 2024 – Jan 2026)
  -- Columns from forms: student name, age at submission, school,
  -- parent phone, whatsapp. No DOB in these forms, age noted.
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO public.students (full_name, phone, parent_phone, notes, created_by)
  SELECT
    t.full_name,
    t.phone,
    t.parent_phone,
    t.notes,
    v_admin_id
  FROM (VALUES
    -- name                              phone           parent_phone    notes
    ('مروان محمد مبروك',               NULL,           '01008710707',  'Saint Mark | سن 13 | تسجيل نوفمبر 2024'),
    ('محمد محمود يحيي',                NULL,           '01125188695',  'النهضة | سن 7 | تسجيل نوفمبر 2024'),
    ('مالك محمد مبروك',                NULL,           '01008710707',  'Saint Mark | سن 6 | تسجيل نوفمبر 2024 | أخ مروان محمد مبروك'),
    ('أنس حسام الدين جابر',            NULL,           '01110456077',  'التوفيق | سن 8-9 | تسجيل نوفمبر 2024 + يناير 2026'),
    ('كريم علاء عبدالرازق',            NULL,           '01201737907',  'النهضة التجريبية | سن 12 | تسجيل نوفمبر 2024'),
    ('محمد شريف زكريا محمد',           NULL,           '01060515564',  'فيوتشر صلاح الدين | سن 7.5 | تسجيل نوفمبر 2024'),
    ('يمني محمود سيد',                 NULL,           '01501532933',  'هابي هوم | سن 11 | تسجيل نوفمبر 2024'),
    ('احمد مصطفى محمد',                NULL,           '01093847872',  'النيل الثانوية | سن 15 | تسجيل نوفمبر 2024'),
    ('بيسان عبدالله طارق',             NULL,           '01030407587',  'ديوان | سن 10 | تسجيل نوفمبر 2024'),
    ('معاذ وائل محمد',                 NULL,           '01009413836',  'المصرية اليابانية | سن 9 | تسجيل نوفمبر 2024'),
    ('عبدالرحمن عمرو محمد',            NULL,           '01280802530',  'الدعوة الإسلامية الإعدادية | سن 14 | تسجيل نوفمبر 2024'),
    ('عمر أشرف عبد الغني أبو المجد',  NULL,           '01027445754',  'الشروق التجريبية | سن 12 | تسجيل نوفمبر 2024'),
    ('احمد محمود علاء',                NULL,           '01144259109',  'الدعوة الإسلامية | سن 12 | تسجيل نوفمبر 2024'),
    ('نورسين أحمد رزق محمد',           NULL,           '01557666853',  'سان مارك | سن 11 | تسجيل نوفمبر 2024'),
    ('يوسف أحمد رزق محمد',            NULL,           '01557666854',  'سان مارك | سن 13 | تسجيل نوفمبر 2024 | أخ نورسين أحمد رزق محمد'),
    ('وتين ماجد احمد',                 NULL,           '01027843927',  'صلاح الدين العالمية | سن 15 | تسجيل نوفمبر 2024'),
    -- ⚠️ معاذ محمد مصطفي أنور: suffix 'أنور' distinguishes from معاذ محمد مصطفى (Batch A)
    ('معاذ محمد مصطفي أنور',          NULL,           '01067224337',  'محمود حمد | سن 13 | تسجيل نوفمبر 2024 | ⚠️ راجع معاذ محمد مصطفى (Batch A)'),
    ('صهيب طه عبد اللطيف',            NULL,           '01110422187',  'الدعوة الإسلامية للغات | سن 11 | تسجيل نوفمبر 2024'),
    ('مريم احمد عبد الحميد محمد',      NULL,           '01125578058',  'أم المؤمنين | سن 15 | تسجيل نوفمبر 2024'),
    ('احمد محمد عبدالعليم',            NULL,           '01002432391',  'عزة زيدان | سن 15 | تسجيل ديسمبر 2024'),
    ('يحيى احمد كمال السعدي',          NULL,           '01065019161',  'الشهيد احمد محمد عبده | سن 10 | تسجيل ديسمبر 2024'),
    ('رقية احمد كمال السعدي',          NULL,           '01065019161',  'الشهيد احمد محمد عبده | سن 8 | تسجيل ديسمبر 2024 | أخت يحيى احمد كمال السعدي'),
    ('آدم محمد عبدالله',               NULL,           '01000895017',  'اللغات الرسمية بدمياط | سن 14 | تسجيل ديسمبر 2024'),
    ('حمزه احمد شوقى',                 NULL,           '01158204184',  'خاتم المرسلين | سن 11 | تسجيل ديسمبر 2024'),
    ('عمر احمد شوقي',                  NULL,           '01158204184',  'خاتم المرسلين | سن 9 | تسجيل ديسمبر 2024 | أخ حمزه احمد شوقى'),
    ('ملك صالح عمر',                   NULL,           '01065825275',  'الثانوية الجديدة بنات | سن 14 | تسجيل ديسمبر 2024'),
    ('اسر وليد اسماعيل',               NULL,           '01017553826',  'الشروق التجريبية | سن 15 | تسجيل ديسمبر 2024 | NOTE: غير آسر محمد رمضان (Batch C)'),
    ('رضوى محمد سليم',                 NULL,           '01040479856',  'الزهراء الثانوية بنات | سن 15 | تسجيل ديسمبر 2024'),
    ('معاذ مصطفى سيد',                 NULL,           '01004873143',  'محمود حمد التجريبية | سن 13 | Science Carnival أكتوبر 2025'),
    ('يوسف أحمد مصطفى',               NULL,           '01003942713',  'الشهيد نور الدين | سن 16 | تسجيل 2024'),
    ('شهد محمد أبو إبراهيم',           NULL,           '01019120699',  'الشهيد مجدي | سن 13 | تسجيل 2024'),
    ('محمد عبد العاطي حسين',           NULL,           '01158328474',  'الاعدادية بنين | سن 13 | تسجيل 2024'),
    ('محمد علي عبدالسلام',             NULL,           '01004240155',  'دفنو الرسمية | سن 12 | تسجيل 2024'),
    ('احمد علي عبدالسلام',             NULL,           '01022335946',  'دفنو الرسمية | سن 13 | تسجيل 2024 | أخ محمد علي عبدالسلام'),
    -- ⚠️ تالين: sibling of محمد وائل أحمد + مالك وائل أحمد (Batch A)
    ('تالين وائل احمد عبدالله',        NULL,           NULL,           'سن 5 | تسجيل يناير 2026 | ⚠️ أخت محمد وائل أحمد + مالك وائل أحمد (Batch A)')
  ) AS t(full_name, phone, parent_phone, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.full_name = t.full_name
  );

  -- ─────────────────────────────────────────────────────────────
  -- SECTION 2 · Competition Records (May 2025)
  -- Source: Robotex / Science Carnival / coding competitions
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO public.students (full_name, phone, parent_phone, notes, created_by)
  SELECT t.full_name, t.phone, t.parent_phone, t.notes, v_admin_id
  FROM (VALUES
    ('عبدالرحمن حمدي',             NULL, NULL, 'مسابقة روبوت | سن 9 | مايو 2025'),
    -- ⚠️ إياد محمد علاء: different from Eyad Ayman Lotfy (Batch E)
    ('إياد محمد علاء',              NULL, NULL, 'App Inventor | سن 11 | مايو 2025 | ⚠️ غير إياد أيمن لطفي (Batch E)'),
    ('جاسر احمد حسن',              NULL, NULL, 'Entrepreneurship | سن 16 | مايو 2025'),
    ('إسماعيل حمدي',               NULL, NULL, 'Web/Codex | سن 11 | مايو 2025 | أخ عبدالرحمن حمدي غالباً'),
    ('ساهر سامح عرفة',             NULL, NULL, 'Web-Codex | سن 15 | مايو + سبتمبر 2025 | الاسم المعكوس: عرفة سامح ساهر — نفس الطالب'),
    ('رؤى شهاب حسن',              NULL, NULL, 'Web-Codex | سن 13 | مايو 2025'),
    ('آدم وليد مصطفي',             NULL, NULL, 'Robotex | سن 13 | مايو 2025 | ظهر 3 مرات — محتسب مرة واحدة'),
    ('عمر عبد اللطيف ممدوح',       NULL, NULL, 'Robot League | سن 7 | مايو 2025'),
    ('Ahmed Mostafa Abd-Elwahab',  NULL, NULL, 'Machine Learning | age 17 | May 2025 | NOTE: different from Abdelrhman Mostafa Abdelwhab (Batch E)'),
    -- ⚠️ إياد باهر: sibling of آدم بحر محمد (Batch A)
    ('إياد باهر',                   NULL, NULL, 'WeDo 2 | مايو 2025 | ⚠️ أخ آدم بحر محمد (Batch A)'),
    ('يحيى أحمد محمد',             NULL, NULL, 'Robot League | سن 8 | مايو 2025'),
    ('مالك محمد سلامة',            NULL, NULL, 'Robot League | سن 7 | مايو 2025'),
    ('معاذ علي محمد',              NULL, NULL, 'App Inventor | مايو 2025'),
    ('عمر أحمد يحيى',              NULL, NULL, 'Robotex | سن 14 | مايو 2025'),
    ('ياس عمر الغزالي',            NULL, NULL, 'Robot Lego | مايو 2025'),
    -- ⚠️ لارا عبد الرحمن محمد: may match لارا (Batch B — no surname stored)
    ('لارا عبد الرحمن محمد',       NULL, NULL, 'Pictoblox | سن 9 | مايو 2025 | ⚠️ راجع لارا (Batch B)'),
    ('تسنيم شهاب حسن سعد',        NULL, NULL, 'Robot League | مايو + أغسطس 2025 | ظهرت مرتين — محتسبة مرة'),
    ('هنا مدحت خالد',              NULL, NULL, 'Web-Codex | سن 15 | مايو 2025'),
    ('معاذ حسن الدين علاء',        NULL, NULL, 'Robot League | سن 7 | مايو 2025'),
    -- ⚠️ أنس حسن الدين علاء: may be sibling of أنس علاء الدين (Batch E); different parent chain
    ('أنس حسن الدين علاء',         NULL, NULL, 'App Inventor | سن 10.5 | مايو 2025 | ⚠️ راجع أنس علاء الدين (Batch E)'),
    ('يوسف ضياء أحمد عبد الله',   NULL, NULL, 'Robot League | سن 7 | مايو 2025'),
    ('مقاريوس ماجد',               NULL, NULL, 'IRC / Entrepreneurship / Afro-Asian | سن 13 | مايو-أغسطس 2025')
  ) AS t(full_name, phone, parent_phone, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.full_name = t.full_name
  );

  -- ─────────────────────────────────────────────────────────────
  -- SECTION 3 · Event/Competition Records (Aug–Dec 2025)
  -- Sources: IRC, Afro-Asian, WeDo Challenge, FPC, Software Leader
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO public.students (full_name, phone, parent_phone, notes, created_by)
  SELECT t.full_name, t.phone, t.parent_phone, t.notes, v_admin_id
  FROM (VALUES
    ('يمني محمد الفاتح ابو الوفاء', NULL, NULL, 'IRC + Afro-Asian | سن 15 | أغسطس-سبتمبر 2025'),
    ('روفيدة محمد عباس',            NULL, NULL, 'WeDo Challenge | سن 9 | أغسطس 2025'),
    ('رضوى عباس محمد',              NULL, NULL, 'IRC | سن 13 | أغسطس 2025'),
    ('مريم احمد صبره',              NULL, NULL, 'IRC | سن 11 | أغسطس 2025'),
    ('سلامة محمد عبدالرحمن',        NULL, NULL, 'IRC | سن 10 | أغسطس 2025'),
    ('المعتصم بالله محمد ثروت',     NULL, NULL, 'WeDo Challenge | سن 10 | أغسطس 2025'),
    ('عبد العزيز كرم',              NULL, NULL, 'WeDo Challenge | سن 9 | أغسطس 2025'),
    ('بلال حسن نجلي',               NULL, NULL, 'WeDo Challenge | سن 10 | أغسطس 2025'),
    ('سيف الله محمد احمد',         NULL, NULL, 'Afro-Asian | سن 14 | أغسطس 2025'),
    ('أدهم مصطفي محمد محمد',        NULL, NULL, 'IRC | سن 14 | أغسطس 2025'),
    ('أفرايم إبراهيم سمير',         NULL, NULL, 'IRC + Afro-Asian | سن 14 | أغسطس 2025'),
    ('فارس صفوت روماني',            NULL, NULL, 'IRC line follower | سن 12 | أغسطس 2025'),
    ('محمد عبد الحميد شحاتة',       NULL, NULL, 'FPC | سن 14 | سبتمبر+ديسمبر 2025 | الاسم الكامل: محمد عبد الحميد محمد عبد الحميد شحاتة'),
    -- ⚠️ جودي محمد ممدوح علي: different from جودي محمد طاهر (Batch A)
    ('جودي محمد ممدوح علي',        NULL, NULL, 'FPC | سن 12 | سبتمبر 2025 | ⚠️ غير جودي محمد طاهر (Batch A)'),
    ('هانا محمد سيري',              NULL, NULL, 'Tricks Land | سن 15 | سبتمبر 2025'),
    ('محمد عمر الغزالي',            NULL, NULL, 'FPC | سن 8 | أكتوبر 2025'),
    ('يوسف صديق',                  NULL, NULL, 'Afro-Asian | سن 13 | أغسطس 2025'),
    ('احمد محمد الشحات',           NULL, NULL, 'Software Leader | سن 15 | سبتمبر 2025')
  ) AS t(full_name, phone, parent_phone, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.full_name = t.full_name
  );

  -- ─────────────────────────────────────────────────────────────
  -- SECTION 4 · Phone-book entries (2023–2026)
  -- Columns: student name, phone (parent), school, age
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO public.students (full_name, phone, parent_phone, notes, created_by)
  SELECT t.full_name, t.phone, t.parent_phone, t.notes, v_admin_id
  FROM (VALUES
    -- ⚠️ لينة عاطف: may match لينة (Batch B — no surname stored)
    ('لينة عاطف عزالعرب محمد',    NULL, '01008035196', 'ديوان | سن 11 | دفتر الأرقام | ⚠️ راجع لينة (Batch B)'),
    -- ⚠️ آسر احمد: different family from آسر محمد رمضان (Batch C)
    ('آسر احمد',                   NULL, '01205789695', 'صلاح الدين فيوتشر | سن 8 | دفتر الأرقام | ⚠️ غير آسر محمد رمضان (Batch C)'),
    ('محمد محمود كمال',            NULL, '01280582038', 'السلام الإعدادية | سن 14 | دفتر الأرقام'),
    ('حمزه احمد عبد الحميد',       NULL, '01066477960', 'زويل | سن 11 | دفتر الأرقام'),
    -- ⚠️ زياد (first name only): may match زياد محمود فهمي (Batch C)
    ('زياد',                        NULL, '01147661022', 'Egypt Dream | سن 14 | دفتر الأرقام | ⚠️ راجع زياد محمود فهمي (Batch C)'),
    ('احمد عمر محمود',              NULL, '01002983335', 'برايت ستارز | سن 7 | دفتر الأرقام'),
    ('روان محمود محمد',             NULL, '01152578423', 'الصفا | سن 13 | دفتر الأرقام'),
    ('عهد',                         NULL, '01152578423', 'السيدة عائشة الابتدائية | سن 11 | دفتر الأرقام | أخت روان محمود محمد غالباً'),
    ('مهرائيل جورج ميخائيل شفيق', NULL, '01277108055', 'الراهبات | سن 15 | دفتر الأرقام'),
    ('احمد محمد فولي',              NULL, '01067711629', 'سعد بن أبي وقاص | سن 11 | دفتر الأرقام'),
    -- ⚠️ عبدالرحمن (first name only — no surname provided)
    ('عبدالرحمن',                   NULL, '01115211221', 'المعهد | سن 14 | دفتر الأرقام | ⚠️ اسم ناقص — راجع الإدخال'),
    ('حارث محمد عوض',              NULL, '01149828526', 'سن 10.5 | دفتر الأرقام'),
    ('يوسف شعبان سيد',             NULL, '01030048086', 'عمر بن عبد العزيز 2 | سن 12 | دفتر الأرقام'),
    ('خديجة محمد فضل الله محمد',   NULL, '01002303012', 'الدعوة الإسلامية للغات | سن 12 | دفتر الأرقام'),
    ('عبد الرحمن محمد حسن',        NULL, '01090902497', 'معهد العدوي الأزهري | سن 7.5 | دفتر الأرقام')
  ) AS t(full_name, phone, parent_phone, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.full_name = t.full_name
  );

END $$;

-- ─────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────
SELECT COUNT(*) AS total_students FROM public.students;

SELECT
  id,
  full_name,
  phone,
  parent_phone,
  LEFT(notes, 60) AS notes_preview,
  created_at::DATE AS added_date
FROM public.students
ORDER BY created_at DESC
LIMIT 120;
