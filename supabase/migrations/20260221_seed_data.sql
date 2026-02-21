-- ============================================================================
-- SEED DATA
-- Clears all operational data (keeps user accounts) and inserts 100+ realistic records
-- Uses DO block to safely reference existing user IDs
-- ============================================================================

DO $$
DECLARE
    v_admin_id          UUID;
    v_coach1_id         UUID;
    v_coach2_id         UUID;
    v_coach3_id         UUID;

    v_course_gym        UUID;
    v_course_acro       UUID;
    v_course_comp       UUID;
    v_course_flex       UUID;
    v_course_strength   UUID;

    v_session_date      DATE;
    v_start_h           INT;
    v_end_h             INT;
    v_i                 INT;
    v_coach_pick        UUID;
    v_course_pick       UUID;
    v_types             TEXT[] := ARRAY['online_session','offline_meeting','online_session','offline_meeting','online_session','online_session'];
BEGIN
    -- ── 1. Get existing user IDs ──────────────────────────────────────────
    SELECT id INTO v_admin_id   FROM profiles WHERE role = 'admin'  LIMIT 1;
    SELECT id INTO v_coach1_id  FROM profiles WHERE role = 'coach'  ORDER BY created_at LIMIT 1;
    SELECT id INTO v_coach2_id  FROM profiles WHERE role = 'coach'  ORDER BY created_at  OFFSET 1 LIMIT 1;
    SELECT id INTO v_coach3_id  FROM profiles WHERE role = 'coach'  ORDER BY created_at  OFFSET 2 LIMIT 1;

    -- If only 1 or 2 coaches exist, reuse them
    IF v_coach2_id IS NULL THEN v_coach2_id := v_coach1_id; END IF;
    IF v_coach3_id IS NULL THEN v_coach3_id := v_coach1_id; END IF;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found. Please create an admin account first.';
    END IF;
    IF v_coach1_id IS NULL THEN
        RAISE EXCEPTION 'No coach user found. Please create at least one coach first.';
    END IF;

    -- ── 2. Clear operational data ─────────────────────────────────────────
    DELETE FROM coach_attendance;
    DELETE FROM adjustments;
    DELETE FROM sessions;
    DELETE FROM hourly_rates;
    DELETE FROM course_students;
    DELETE FROM students;
    DELETE FROM course_coaches;
    DELETE FROM courses;

    -- ── 3. Update coach base rates ────────────────────────────────────────
    UPDATE profiles SET
        base_hourly_rate      = 80.00,
        rate_effective_from   = '2024-01-01',
        next_rate_increase_date = '2025-01-01',
        bio = 'Senior gymnastics and acrobatics coach with over 10 years of competitive experience. Specializes in floor routines and aerial skills.'
    WHERE id = v_coach1_id;

    UPDATE profiles SET
        base_hourly_rate      = 65.00,
        rate_effective_from   = '2024-06-01',
        next_rate_increase_date = '2025-06-01',
        bio = 'Certified flexibility and strength trainer. Former national athlete with a passion for youth development and injury prevention.'
    WHERE id = v_coach2_id AND v_coach2_id != v_coach1_id;

    UPDATE profiles SET
        base_hourly_rate      = 70.00,
        rate_effective_from   = '2023-09-01',
        next_rate_increase_date = '2024-09-01',
        bio = 'Competition specialist and performance coach. Experienced in choreography, judging criteria, and mental preparation for athletes.'
    WHERE id = v_coach3_id AND v_coach3_id != v_coach1_id AND v_coach3_id != v_coach2_id;

    -- ── 4. Create courses ─────────────────────────────────────────────────
    INSERT INTO courses (id, name, description, status, created_by, hourly_rate)
    VALUES (uuid_generate_v4(), 'Gymnastics Basics', 'Foundation gymnastics skills for beginners and intermediates.', 'active', v_admin_id, 90.00)
    RETURNING id INTO v_course_gym;

    INSERT INTO courses (id, name, description, status, created_by, hourly_rate)
    VALUES (uuid_generate_v4(), 'Acrobatics Advanced', 'Advanced acrobatic training for competitive athletes.', 'active', v_admin_id, 110.00)
    RETURNING id INTO v_course_acro;

    INSERT INTO courses (id, name, description, status, created_by, hourly_rate)
    VALUES (uuid_generate_v4(), 'Competition Prep', 'Intensive competition preparation and performance coaching.', 'active', v_admin_id, 75.00)
    RETURNING id INTO v_course_comp;

    INSERT INTO courses (id, name, description, status, created_by, hourly_rate)
    VALUES (uuid_generate_v4(), 'Flexibility & Conditioning', 'Stretching, mobility, and physical conditioning sessions.', 'active', v_admin_id, 70.00)
    RETURNING id INTO v_course_flex;

    INSERT INTO courses (id, name, description, status, created_by, hourly_rate)
    VALUES (uuid_generate_v4(), 'Strength Training', 'Sport-specific strength and power development program.', 'active', v_admin_id, 80.00)
    RETURNING id INTO v_course_strength;

    -- ── 5. Add students (global students table, then link to courses) ─────
    -- Insert students and capture their IDs
    WITH new_students AS (
        INSERT INTO students (full_name, created_by) VALUES
            ('Sara Ahmed',      v_admin_id),
            ('Layla Hassan',    v_admin_id),
            ('Nour Ali',        v_admin_id),
            ('Rana Mostafa',    v_admin_id),
            ('Kareem Ibrahim',  v_admin_id),
            ('Ziad Mansour',    v_admin_id),
            ('Tarek Youssef',   v_admin_id),
            ('Dina Fawzy',      v_admin_id),
            ('Mira Saad',       v_admin_id),
            ('Omar Khalil',     v_admin_id),
            ('Hana Nabil',      v_admin_id),
            ('Salma Rizk',      v_admin_id),
            ('Adam Sherif',     v_admin_id),
            ('Yasmine Gamal',   v_admin_id),
            ('Mahmoud Farouk',  v_admin_id)
        RETURNING id, full_name
    )
    INSERT INTO course_students (course_id, student_id, created_by)
    SELECT
        CASE ns.full_name
            WHEN 'Sara Ahmed'     THEN v_course_gym
            WHEN 'Layla Hassan'   THEN v_course_gym
            WHEN 'Nour Ali'       THEN v_course_gym
            WHEN 'Rana Mostafa'   THEN v_course_gym
            WHEN 'Kareem Ibrahim' THEN v_course_acro
            WHEN 'Ziad Mansour'   THEN v_course_acro
            WHEN 'Tarek Youssef'  THEN v_course_acro
            WHEN 'Dina Fawzy'     THEN v_course_comp
            WHEN 'Mira Saad'      THEN v_course_comp
            WHEN 'Omar Khalil'    THEN v_course_comp
            WHEN 'Hana Nabil'     THEN v_course_flex
            WHEN 'Salma Rizk'     THEN v_course_flex
            WHEN 'Adam Sherif'    THEN v_course_strength
            WHEN 'Yasmine Gamal'  THEN v_course_strength
            WHEN 'Mahmoud Farouk' THEN v_course_strength
        END,
        ns.id,
        v_admin_id
    FROM new_students ns;

    -- ── 6. Assign coaches to courses ──────────────────────────────────────
    INSERT INTO course_coaches (course_id, coach_id, assigned_by) VALUES
        (v_course_gym,      v_coach1_id, v_admin_id),
        (v_course_acro,     v_coach1_id, v_admin_id),
        (v_course_comp,     v_coach1_id, v_admin_id),
        (v_course_flex,     v_coach2_id, v_admin_id),
        (v_course_strength, v_coach2_id, v_admin_id),
        (v_course_gym,      v_coach3_id, v_admin_id),
        (v_course_comp,     v_coach3_id, v_admin_id);

    -- ── 7. Set hourly_rates (course-coach specific) ───────────────────────
    -- Using effective_from = 2024-01-01 so ALL past sessions get picked up
    INSERT INTO hourly_rates (course_id, coach_id, rate, effective_from, created_by) VALUES
        (v_course_gym,      v_coach1_id, 90.00,  '2024-01-01', v_admin_id),
        (v_course_acro,     v_coach1_id, 110.00, '2024-01-01', v_admin_id),
        (v_course_comp,     v_coach1_id, 75.00,  '2024-01-01', v_admin_id),
        (v_course_flex,     v_coach2_id, 70.00,  '2024-01-01', v_admin_id),
        (v_course_strength, v_coach2_id, 80.00,  '2024-01-01', v_admin_id),
        (v_course_gym,      v_coach3_id, 85.00,  '2024-01-01', v_admin_id),
        (v_course_comp,     v_coach3_id, 75.00,  '2024-01-01', v_admin_id);

    -- ── 8. Insert 110 sessions spread over past 7 months ─────────────────
    FOR v_i IN 1..110 LOOP
        -- Spread dates evenly over the past 7 months
        v_session_date := CURRENT_DATE - (v_i * 2)::INT;

        -- Rotate through coaches and courses
        CASE (v_i % 7)
            WHEN 0 THEN v_coach_pick := v_coach1_id; v_course_pick := v_course_gym;
            WHEN 1 THEN v_coach_pick := v_coach1_id; v_course_pick := v_course_acro;
            WHEN 2 THEN v_coach_pick := v_coach1_id; v_course_pick := v_course_comp;
            WHEN 3 THEN v_coach_pick := v_coach2_id; v_course_pick := v_course_flex;
            WHEN 4 THEN v_coach_pick := v_coach2_id; v_course_pick := v_course_strength;
            WHEN 5 THEN v_coach_pick := v_coach3_id; v_course_pick := v_course_gym;
            ELSE        v_coach_pick := v_coach3_id; v_course_pick := v_course_comp;
        END CASE;

        -- Vary session hours (1.5h, 2h, 2.5h, 3h)
        v_start_h := 9 + (v_i % 4) * 2;
        v_end_h   := v_start_h + 1 + (v_i % 3);

        INSERT INTO sessions (
            course_id, paid_coach_id, session_date,
            start_time, end_time, session_type,
            notes, created_by, attendance_required
        ) VALUES (
            v_course_pick,
            v_coach_pick,
            v_session_date,
            (v_start_h || ':00')::TIME,
            (v_end_h   || ':00')::TIME,
            v_types[1 + (v_i % array_length(v_types, 1))]::session_type,
            CASE WHEN v_i % 5 = 0 THEN 'Regular weekly session - great progress noted.' ELSE NULL END,
            v_admin_id,
            true
        );
    END LOOP;

    -- ── 9. Insert attendance records (about 70 of 110 sessions attended) ──
    INSERT INTO coach_attendance (coach_id, session_id, latitude, longitude, distance_from_academy, attendance_timestamp, status, marked_by_admin)
    SELECT
        s.paid_coach_id,
        s.id,
        29.073694 + (random() * 0.0002 - 0.0001),
        31.112250 + (random() * 0.0002 - 0.0001),
        round((random() * 40)::numeric, 1),
        (s.session_date::TIMESTAMPTZ + INTERVAL '5 minutes' + (random() * INTERVAL '30 minutes')),
        (CASE WHEN random() > 0.15 THEN 'present' ELSE 'late' END)::attendance_status,
        false
    FROM sessions s
    ORDER BY s.session_date DESC
    LIMIT 78;

    -- ── 10. Add 5 admin-marked attendance records ──────────────────────────
    INSERT INTO coach_attendance (coach_id, session_id, latitude, longitude, distance_from_academy, attendance_timestamp, status, marked_by_admin)
    SELECT
        s.paid_coach_id,
        s.id,
        0, 0, 0,
        (s.session_date::TIMESTAMPTZ + INTERVAL '1 hour'),
        'present'::attendance_status,
        true
    FROM sessions s
    WHERE s.id NOT IN (SELECT DISTINCT session_id FROM coach_attendance)
    ORDER BY s.session_date DESC
    LIMIT 5;

    -- ── 11. Add salary adjustments ────────────────────────────────────────
    INSERT INTO adjustments (coach_id, month, type, amount, notes, created_by) VALUES
        (v_coach1_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),               'bonus',    200.00, 'Performance bonus – excellent student feedback this month.', v_admin_id),
        (v_coach1_id, TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'), 'bonus', 150.00, 'Competition coaching bonus.', v_admin_id),
        (v_coach2_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),               'bonus',    100.00, 'Extra conditioning workshop conducted.', v_admin_id),
        (v_coach2_id, TO_CHAR(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'), 'discount', 50.00, 'Late submission penalty for session logs.', v_admin_id),
        (v_coach3_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),               'bonus',    250.00, 'Competition season coaching bonus.', v_admin_id),
        (v_coach3_id, TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'), 'discount', 75.00, 'Absence without notice – deduction applied.', v_admin_id);

    RAISE NOTICE 'Seed data inserted successfully. Admin: %, Coach1: %, Coach2: %, Coach3: %',
        v_admin_id, v_coach1_id, v_coach2_id, v_coach3_id;
END $$;
