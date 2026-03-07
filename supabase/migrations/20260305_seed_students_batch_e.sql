-- ============================================================
-- SEED: Batch E — 27 students (Feb–Mar 2026 event forms)
-- Uses WHERE NOT EXISTS → safe to run multiple times, ZERO duplicates.
--
-- ✅ SKIPPED (confirmed match with existing records by DOB):
--    • Adam Baher Mohammed      (8/6/2011)  = آدم بحر محمد       (Batch A)
--    • Fares Alaa El-Din Hassan (8/12/2012) = فارس علاء الدين حسن (Batch A)
--    • Ali wesam bakry          (12/28/2011)= علي وسام بكري       (Batch A)
--    • Hassan Maged Ahmed       (11/23/2012)= حسن ماجد احمد       (Batch D)
--    • Noor Moaaz Emad Gaber    (duplicate submission — kept once)
--    • Mariam Mohamed           (9/30/2011) = Mariam Mohamed El sayed (same person)
--
-- ⚠️  Ammar Hassan Abas Hassaballah DOB 2013-06-21 ≈ عمار حسن عباس DOB 2013-06-20
--     (1-day difference — possible same person, possible typo. Check manually.)
-- ⚠️  Fayrouz Tarek Ahmed DOB 2017-12-01 ≈ فيرزو طارق احمد (Batch B, no DOB)
--     (same name different spelling — may be same person. Check manually.)
-- ⚠️  Yehia samer yehia DOB 2026-04-10 is a future date — likely typo (2013?)
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin profile found. Create an admin account first.';
    END IF;

    INSERT INTO public.students (full_name, date_of_birth, notes, created_by)
    SELECT full_name, date_of_birth, notes, v_admin_id
    FROM (VALUES
        -- ── Entrepreneurship ────────────────────────────────────────────
        ('Mohamed Saleh Mohamed',         '2010-06-08'::DATE, 'Activity: Entrepreneurship | Coach: Yossef Ahmed'),
        ('Omar Saleh Mohamed',            '2010-06-08'::DATE, 'Activity: Entrepreneurship | Coach: Yossef'),
        ('Ammar Hassan Abas Hassaballah', '2013-06-21'::DATE, 'Activity: Entrepreneurship | Coach: Youssef | ⚠️ DOB 1 day diff from عمار حسن عباس Batch A'),
        ('Abdelrhman Mostafa Abdelwhab',  '2009-09-16'::DATE, 'Activity: Entrepreneurship | Coach: Youssef Ahmed'),

        -- ── Science and Robotics Carnival ───────────────────────────────
        ('Noor Moaaz Emad Gaber',         '2016-08-07'::DATE, 'Activity: Science and Robotics Carnival | Coach: Sama Nageeb'),
        ('Fayrouz Tarek Ahmed',           '2017-12-01'::DATE, 'Activity: Science and Robotics Carnival | Coach: Sama Nageeb | ⚠️ may = فيرزو طارق احمد Batch B'),
        ('Youssef Hassan Abas Hasaballah','2019-05-11'::DATE, 'Activity: Science and Robotics Carnival | Coach: Ahmed Hossam'),
        ('Yassin Wael Mahmoud',           '2017-04-11'::DATE, 'Activity: Science and Robotics Carnival | Coach: Ahmed Hossam'),
        ('Anas Alaa El-Din',              '2017-12-27'::DATE, 'Activity: Science and Robotics Carnival | Coach: Ahmed Hossam'),
        ('Retal Mohamed Elsayed',         '2016-08-17'::DATE, 'Activity: Science and Robotics Carnival | Coach: Sama'),

        -- ── Healthcare AI ────────────────────────────────────────────────
        ('Mohamed Mostafa Sabrallah',     '2011-12-22'::DATE, 'Activity: Healthcare AI | Coach: Mohamed Abo Bakr'),
        ('Yehia Samer Yehia',             '2026-04-10'::DATE, 'Activity: Healthcare AI | Coach: Mohammed Abo Bakr | ⚠️ future DOB — verify year'),
        ('Marwan Mohammed Serry',         '2010-09-19'::DATE, 'Activity: Healthcare AI | Coach: Mohammed Abobakr'),
        ('Mariam Mohamed El Sayed',       '2011-09-30'::DATE, 'Activity: Healthcare AI | Coach: Mohamed Mokhtar'),
        ('Farida Tarek Ahmed',            '2013-09-09'::DATE, 'Activity: Healthcare AI | Coach: Mohamed Mokhtar'),
        ('Ayten Ahmed Abass Helmy',       '2010-11-11'::DATE, 'Activity: Healthcare AI | Coach: عمر مستر'),
        ('Nancy Ahmed Mohammed',          '2004-04-18'::DATE, 'Activity: Healthcare AI | Coach: Rofaida'),
        ('Nada Fahmy Mohamed',            '2003-11-16'::DATE, 'Activity: Healthcare AI | Coach: Rofaida Amer'),
        ('Shorok Yasser Sayed Hassan',    '2004-04-19'::DATE, 'Activity: Healthcare AI | Coach: Rofaida Amer'),

        -- ── Flag Collector ───────────────────────────────────────────────
        ('Osama Ahmed Mohsen',            '2015-08-27'::DATE, 'Activity: Flag Collector | Coach: Abdul-Rahman Shawky'),
        ('Yahia Yasser Sayed',            '2014-11-23'::DATE, 'Activity: Flag Collector | Coach: Abdulrahman Shawky'),

        -- ── Young Innovators ─────────────────────────────────────────────
        ('Motasem Mahmoud Said',          '2013-06-12'::DATE, 'Activity: Young Innovators | Coach: Nour'),
        ('Adam Mahmoud Taha',             '2014-04-24'::DATE, 'Activity: Young Innovators | Coach: Nour'),
        ('Eyad Ayman Lotfy',              '2015-01-11'::DATE, 'Activity: Young Innovators | Coach: Nour'),
        ('Mohamed Sayed Mosaad',          '2012-01-24'::DATE, 'Activity: Young Innovators | Coach: Nour'),

        -- ── Mobile Application ───────────────────────────────────────────
        ('AbdElRahman Ahmed Helmy',       '2014-08-27'::DATE, 'Activity: Mobile Application | Coach: Rawan'),
        ('Anas Alaa El-Din Hassan',       '2014-07-03'::DATE, 'Activity: Mobile Application | Coach: Rawan')

    ) AS t(full_name, date_of_birth, notes)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.students s WHERE s.full_name = t.full_name
    );

END $$;

-- Verify
SELECT full_name, date_of_birth,
       DATE_PART('year', AGE(date_of_birth))::INT AS age,
       notes
FROM public.students
WHERE notes LIKE '%Activity:%'
ORDER BY date_of_birth DESC NULLS LAST;
