-- ============================================================
-- SEED: 46 students
-- Run in Supabase SQL Editor AFTER at least one admin exists.
-- Age is computed dynamically from date_of_birth in the UI —
-- no cron job needed; it updates automatically every page load.
--
-- ⚠️  نورين سلطان محمد  has DOB  14/7/2026  (future) — inserted
--     as-is. Correct to 2016 via Edit Student if it was a typo.
-- ⚠️  سيليا محمود كمال  has no DOB — inserted as NULL.
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin profile found. Create an admin account first.';
    END IF;

    INSERT INTO public.students (full_name, date_of_birth, created_by)
    VALUES
        ('نيره حسن عباس',                  '2014-11-21', v_admin_id),
        ('لين محمد أحمد',                   '2013-12-23', v_admin_id),
        ('حبيبة أحمد أنور',                 '2015-03-13', v_admin_id),
        ('سلمى محمد مصطفى',                 '2015-06-14', v_admin_id),
        ('نورين سلطان محمد',                '2026-07-14', v_admin_id),  -- ⚠️ future date — verify year
        ('جني عبد المنعم محمد',             '2013-08-31', v_admin_id),
        ('حمزة محمد محمود',                 '2012-11-14', v_admin_id),
        ('الزهراء محمد محمود',              '2014-07-07', v_admin_id),
        ('روضة عبد العزيز صابر',            '2014-10-03', v_admin_id),
        ('عمر مصطفى عبد الفتاح سيد',       '2015-06-15', v_admin_id),
        ('مالك مصطفى عبد الفتاح سيد',      '2015-06-15', v_admin_id),
        ('أنس وسام بكري',                   '2015-08-13', v_admin_id),
        ('محمد شهاب محمود فهمي',            '2017-04-24', v_admin_id),
        ('محمد وائل أحمد',                  '2015-03-08', v_admin_id),
        ('مالك وائل أحمد',                  '2016-03-04', v_admin_id),
        ('مازن حسام جمال',                  '2015-03-12', v_admin_id),
        ('مروان حسام جمال',                 '2015-03-12', v_admin_id),
        ('مسك محمود جلال الدين',            '2020-03-13', v_admin_id),
        ('هيا سلطان محمد',                  '2020-02-22', v_admin_id),
        ('سيليا محمود كمال',                NULL,         v_admin_id),  -- no DOB provided
        ('عمر أحمد محمد',                   '2013-07-04', v_admin_id),
        ('عمار حسن عباس',                   '2013-06-20', v_admin_id),
        ('آدم بحر محمد',                    '2011-08-06', v_admin_id),
        ('فارس علاء الدين حسن',             '2012-08-12', v_admin_id),
        ('حذيفه طارق عبد اللطيف',           '2010-11-13', v_admin_id),
        ('جمال أحمد جمال',                  '2012-11-01', v_admin_id),
        ('يوسف محمد عبد الوهاب',            '2012-11-17', v_admin_id),
        ('أنس ياسر أحمد',                   '2011-11-14', v_admin_id),
        ('معاذ مصطفى سعيد',                 '2013-01-11', v_admin_id),
        ('يونس عبد الرحمن يونس',            '2012-07-23', v_admin_id),
        ('نور بهاء طه',                     '2011-01-01', v_admin_id),
        ('البراء أحمد يحيى',                '2008-12-09', v_admin_id),
        ('ملك محمد مصطفى',                  '2009-08-21', v_admin_id),
        ('لجين عبد الرحمن أحمد',            '2011-03-04', v_admin_id),
        ('معاذ محمد مصطفى',                 '2012-06-13', v_admin_id),
        ('زينب أحمد أنور',                  '2009-09-21', v_admin_id),
        ('مالك محمد متولي',                 '2012-08-28', v_admin_id),
        ('آدم عمرو محسن',                   '2011-08-03', v_admin_id),
        ('مالك ضياء أحمد',                  '2012-07-18', v_admin_id),
        ('منذر ضياء أحمد',                  '2012-07-18', v_admin_id),
        ('جودي محمد طاهر',                  '2012-07-26', v_admin_id),
        ('أحمد محمد أحمد',                  '2010-09-30', v_admin_id),
        ('علي وسام بكري',                   '2011-12-28', v_admin_id),
        ('سندس مصطفى عبد الفتاح سيد',      '2012-01-25', v_admin_id),
        ('يارا سلطان محمد عاطف',            '2011-05-02', v_admin_id),
        ('ندى محمد مصطفى',                  '2021-04-21', v_admin_id)
    ON CONFLICT DO NOTHING;

END $$;

-- Verify
SELECT full_name, date_of_birth,
       DATE_PART('year', AGE(date_of_birth))::INT AS age_now
FROM public.students
ORDER BY full_name;
