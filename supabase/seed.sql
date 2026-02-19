-- Treeks Land - Seed Data for Testing
-- Run this AFTER the initial migration and AFTER creating auth users

-- This script assumes you've created Supabase Auth users first.
-- Replace the UUIDs below with actual user IDs from your Supabase Auth dashboard.

-- ============================================================================
-- IMPORTANT: Create these users in Supabase Auth FIRST
-- ============================================================================
-- Go to Authentication → Users → Add User
-- 1. admin@tricksland.com (save the UUID)
-- 2. coach1@tricksland.com (save the UUID)
-- 3. coach2@tricksland.com (save the UUID)
--
-- Then replace the UUIDs below with your actual auth user IDs:
-- ============================================================================

-- Example UUIDs (REPLACE THESE WITH YOUR ACTUAL ONES!)
DO $$
DECLARE
    admin_id UUID := 'a33d273a-f8e5-4092-921a-116ca2da3729'; -- Replace with real UUID
    coach1_id UUID := 'e1148cdf-55b2-4c34-938f-0e53e1eb7711'; -- Replace with real UUID
    coach2_id UUID := 'c446db72-3ae3-4016-9750-5b553269a6c2'; -- Replace with real UUID
    
    course1_id UUID;
    course2_id UUID;
    course3_id UUID;
BEGIN
    -- ============================================================================
    -- PROFILES
    -- ============================================================================
    
    INSERT INTO profiles (id, full_name, email, role)
    VALUES 
        (admin_id, 'Admin User', 'admin@tricksland.com', 'admin'),
        (coach1_id, 'Ahmed Hassan', 'coach1@tricksland.com', 'coach'),
        (coach2_id, 'Sara Mohamed', 'coach2@tricksland.com', 'coach')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- COURSES
    -- ============================================================================
    
    -- Insert courses one by one to capture IDs
    INSERT INTO courses (name, description, status, created_by)
    VALUES ('Web Development Fundamentals', 'Learn HTML, CSS, and JavaScript basics', 'active', admin_id)
    RETURNING id INTO course1_id;
    
    INSERT INTO courses (name, description, status, created_by)
    VALUES ('Advanced React & Next.js', 'Build modern web applications with React 18 and Next.js 14', 'active', admin_id)
    RETURNING id INTO course2_id;
    
    INSERT INTO courses (name, description, status, created_by)
    VALUES ('Mobile App Development', 'Create cross-platform mobile apps with React Native', 'active', admin_id)
    RETURNING id INTO course3_id;

    -- ============================================================================
    -- COURSE COACHES (Assignments)
    -- ============================================================================
    
    -- Coach 1 (Ahmed) teaches Web Dev and React
    INSERT INTO course_coaches (course_id, coach_id, assigned_by)
    VALUES 
        (course1_id, coach1_id, admin_id),
        (course2_id, coach1_id, admin_id);
    
    -- Coach 2 (Sara) teaches React and Mobile
    INSERT INTO course_coaches (course_id, coach_id, assigned_by)
    VALUES 
        (course2_id, coach2_id, admin_id),
        (course3_id, coach2_id, admin_id);

    -- ============================================================================
    -- STUDENTS (Just names, no authentication)
    -- ============================================================================
    
    -- Web Dev students
    INSERT INTO course_students (course_id, student_name, created_by)
    VALUES 
        (course1_id, 'محمد علي', admin_id),
        (course1_id, 'فاطمة أحمد', admin_id),
        (course1_id, 'عمر خالد', admin_id),
        (course1_id, 'ليلى حسن', admin_id);
    
    -- React students
    INSERT INTO course_students (course_id, student_name, created_by)
    VALUES 
        (course2_id, 'يوسف إبراهيم', admin_id),
        (course2_id, 'نور الدين', admin_id),
        (course2_id, 'عائشة السيد', admin_id);
    
    -- Mobile students
    INSERT INTO course_students (course_id, student_name, created_by)
    VALUES 
        (course3_id, 'كريم محمود', admin_id),
        (course3_id, 'منى سعيد', admin_id);

    -- ============================================================================
    -- HOURLY RATES (Per course-coach with history)
    -- ============================================================================
    
    -- Coach 1 rates (different for each course)
    INSERT INTO hourly_rates (course_id, coach_id, rate, effective_from, created_by)
    VALUES 
        -- Web Dev: Started at 50 EGP/hour on Feb 1
        (course1_id, coach1_id, 50.00, '2026-02-01', admin_id),
        -- Increased to 60 EGP/hour on Feb 15 (demonstrates rate history)
        (course1_id, coach1_id, 60.00, '2026-02-15', admin_id),
        
        -- React: Higher rate of 75 EGP/hour (same coach, different course)
        (course2_id, coach1_id, 75.00, '2026-02-01', admin_id);
    
    -- Coach 2 rates
    INSERT INTO hourly_rates (course_id, coach_id, rate, effective_from, created_by)
    VALUES 
        -- React: 70 EGP/hour
        (course2_id, coach2_id, 70.00, '2026-02-01', admin_id),
        
        -- Mobile: 80 EGP/hour (highest rate)
        (course3_id, coach2_id, 80.00, '2026-02-01', admin_id);

    -- ============================================================================
    -- SESSIONS (Sample sessions for February 2026)
    -- ============================================================================
    
    -- Coach 1 - Web Dev sessions (will use rates:  50 before Feb 15, 60 after)
    INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by)
    VALUES 
        (course1_id, '2026-02-05', '10:00', '12:00', 'online_session', coach1_id, 'Introduction to HTML', coach1_id),
        (course1_id, '2026-02-08', '10:00', '13:00', 'online_session', coach1_id, 'CSS Fundamentals', coach1_id),
        (course1_id, '2026-02-12', '14:00', '16:00', 'offline_meeting', coach1_id, 'In-person workshop', coach1_id);
    
    -- Coach 1 - React sessions (75 EGP/hour)
    INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by)
    VALUES 
        (course2_id, '2026-02-06', '15:00', '18:00', 'online_session', coach1_id, 'React Hooks', coach1_id),
        (course2_id, '2026-02-13', '15:00', '17:00', 'online_session', coach1_id, 'Next.js App Router', coach1_id);
    
    -- Coach 2 - React sessions (70 EGP/hour)
    INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by)
    VALUES 
        (course2_id, '2026-02-07', '16:00', '19:00', 'online_session', coach2_id, 'State Management', coach2_id),
        (course2_id, '2026-02-14', '16:00', '18:00', 'online_session', coach2_id, 'Server Components', coach2_id);
    
    -- Coach 2 - Mobile sessions (80 EGP/hour)
    INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by)
    VALUES 
        (course3_id, '2026-02-09', '10:00', '13:00', 'online_session', coach2_id, 'React Native Basics', coach2_id),
        (course3_id, '2026-02-16', '10:00', '12:00', 'online_session', coach2_id, 'Navigation', coach2_id);
    
    -- REPLACEMENT COACH EXAMPLE: Coach 2 covers for Coach 1 on Web Dev
    INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, originally_scheduled_coach_id, paid_coach_id, notes, created_by)
    VALUES 
        (course1_id, '2026-02-19', '10:00', '12:00', 'online_session', coach1_id, coach2_id, 'JavaScript - Coach 2 covered for Coach 1', coach2_id);
    
    -- More sessions after rate change (Feb 15) - should use 60 EGP/hour
    INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by)
    VALUES 
        (course1_id, '2026-02-20', '10:00', '12:00', 'online_session', coach1_id, 'Advanced JavaScript - uses new  rate 60', coach1_id),
        (course1_id, '2026-02-26', '14:00', '17:00', 'offline_meeting', coach1_id, 'Final project workshop', coach1_id);

    -- ============================================================================
    -- ADJUSTMENTS (Bonuses and Discounts for February)
    -- ============================================================================
    
    -- Bonus for Coach 1
    INSERT INTO adjustments (coach_id, month, type, amount, notes, created_by)
    VALUES 
        (coach1_id, '2026-02', 'bonus', 100.00, 'Excellent student feedback and participation', admin_id);
    
    -- Discount for Coach 2 (e.g., deduction for equipment)
    INSERT INTO adjustments (coach_id, month, type, amount, notes, created_by)
    VALUES 
        (coach2_id, '2026-02', 'discount', 50.00, 'Equipment purchase reimbursement', admin_id);

    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Course IDs created: %, %, %', course1_id, course2_id, course3_id;
    RAISE NOTICE 'Remember to replace admin_id, coach1_id, coach2_id with real Supabase Auth user IDs!';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify the data:

-- SELECT * FROM profiles;
-- SELECT * FROM courses;
-- SELECT * FROM course_coaches cc
--  JOIN profiles p ON cc.coach_id = p.id
--   JOIN courses c ON cc.course_id = c.id;
-- SELECT * FROM hourly_rates hr
--   JOIN profiles p ON hr.coach_id = p.id
--   JOIN courses c ON hr.course_id = c.id;
-- SELECT * FROM sessions s
--   JOIN courses c ON s.course_id = c.id
--   JOIN profiles p ON s.paid_coach_id = p.id;
-- SELECT * FROM coach_monthly_totals WHERE month = '2026-02';
