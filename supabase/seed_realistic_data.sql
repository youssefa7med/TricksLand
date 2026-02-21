-- Comprehensive Seed Data Script
-- Creates ~100 realistic records for testing and demonstration
-- Run this AFTER applying all migrations

-- ============================================================================
-- CLEAR EXISTING DATA (Optional - uncomment if you want to start fresh)
-- ============================================================================
-- DELETE FROM coach_attendance;
-- DELETE FROM sessions;
-- DELETE FROM hourly_rates;
-- DELETE FROM course_coaches;
-- DELETE FROM course_students;
-- DELETE FROM courses;
-- DELETE FROM adjustments;
-- DELETE FROM profiles WHERE role = 'coach';

-- ============================================================================
-- COACHES (15 coaches with base rates)
-- ============================================================================

-- Get admin user ID (assuming one exists)
DO $$
DECLARE
    admin_id UUID;
    coach1_id UUID;
    coach2_id UUID;
    coach3_id UUID;
    coach4_id UUID;
    coach5_id UUID;
    coach6_id UUID;
    coach7_id UUID;
    coach8_id UUID;
    coach9_id UUID;
    coach10_id UUID;
    coach11_id UUID;
    coach12_id UUID;
    coach13_id UUID;
    coach14_id UUID;
    coach15_id UUID;
BEGIN
    -- Get admin ID
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found. Please create an admin user first.';
    END IF;

    -- Create coaches with base rates
    INSERT INTO profiles (full_name, email, role, base_hourly_rate, rate_effective_from, created_by_admin)
    VALUES 
        ('أحمد محمد علي', 'ahmed.mohamed@example.com', 'coach', 50.00, '2024-01-01', true),
        ('فاطمة أحمد', 'fatima.ahmed@example.com', 'coach', 55.00, '2024-01-15', true),
        ('محمد خالد', 'mohamed.khaled@example.com', 'coach', 60.00, '2023-06-01', true),
        ('سارة محمود', 'sara.mahmoud@example.com', 'coach', 65.00, '2024-02-01', true),
        ('علي حسن', 'ali.hassan@example.com', 'coach', 70.00, '2023-01-01', true),
        ('مريم إبراهيم', 'mariam.ibrahim@example.com', 'coach', 45.00, '2024-03-01', true),
        ('يوسف عبدالله', 'youssef.abdullah@example.com', 'coach', 75.00, '2022-01-01', true),
        ('نورا سعيد', 'nora.saeed@example.com', 'coach', 58.00, '2024-01-10', true),
        ('خالد أمين', 'khaled.amin@example.com', 'coach', 62.00, '2023-09-01', true),
        ('ليلى فؤاد', 'layla.fouad@example.com', 'coach', 68.00, '2023-03-15', true),
        ('طارق رشيد', 'tarek.rashid@example.com', 'coach', 52.00, '2024-02-15', true),
        ('هدى كمال', 'huda.kamal@example.com', 'coach', 72.00, '2022-06-01', true),
        ('عمر ناصر', 'omar.nasser@example.com', 'coach', 48.00, '2024-04-01', true),
        ('رانيا شريف', 'rania.sharif@example.com', 'coach', 66.00, '2023-11-01', true),
        ('محمود عادل', 'mahmoud.adel@example.com', 'coach', 80.00, '2021-01-01', true)
    RETURNING id INTO coach1_id, coach2_id, coach3_id, coach4_id, coach5_id, coach6_id, coach7_id, coach8_id, coach9_id, coach10_id, coach11_id, coach12_id, coach13_id, coach14_id, coach15_id;

    -- ============================================================================
    -- COURSES (10 courses including competition courses)
    -- ============================================================================
    
    DECLARE
        course1_id UUID;
        course2_id UUID;
        course3_id UUID;
        course4_id UUID;
        course5_id UUID;
        course6_id UUID;
        course7_id UUID;
        course8_id UUID;
        course9_id UUID;
        course10_id UUID;
    BEGIN
        INSERT INTO courses (name, description, status, hourly_rate, created_by)
        VALUES 
            ('Web Development Fundamentals', 'Learn HTML, CSS, and JavaScript basics', 'active', 50.00, admin_id),
            ('React Advanced', 'Advanced React patterns and Next.js', 'active', 60.00, admin_id),
            ('Mobile App Development', 'React Native and Flutter', 'active', 65.00, admin_id),
            ('Data Science Bootcamp', 'Python, pandas, and machine learning', 'active', 70.00, admin_id),
            ('UI/UX Design', 'Figma, design principles, and prototyping', 'active', 55.00, admin_id),
            ('Competition Programming', 'Algorithms and competitive programming', 'active', NULL, admin_id),
            ('Cybersecurity Basics', 'Network security and ethical hacking', 'active', 75.00, admin_id),
            ('Python for Beginners', 'Python programming fundamentals', 'active', 45.00, admin_id),
            ('Full Stack Development', 'MERN stack development', 'active', 68.00, admin_id),
            ('Competition Advanced', 'Advanced competitive programming', 'active', NULL, admin_id)
        RETURNING id INTO course1_id, course2_id, course3_id, course4_id, course5_id, course6_id, course7_id, course8_id, course9_id, course10_id;

        -- ============================================================================
        -- COURSE-COACH ASSIGNMENTS
        -- ============================================================================
        
        INSERT INTO course_coaches (course_id, coach_id, assigned_by)
        VALUES 
            -- Web Dev: 3 coaches
            (course1_id, coach1_id, admin_id),
            (course1_id, coach2_id, admin_id),
            (course1_id, coach3_id, admin_id),
            
            -- React: 2 coaches
            (course2_id, coach4_id, admin_id),
            (course2_id, coach5_id, admin_id),
            
            -- Mobile: 2 coaches
            (course3_id, coach6_id, admin_id),
            (course3_id, coach7_id, admin_id),
            
            -- Data Science: 2 coaches
            (course4_id, coach8_id, admin_id),
            (course4_id, coach9_id, admin_id),
            
            -- UI/UX: 2 coaches
            (course5_id, coach10_id, admin_id),
            (course5_id, coach11_id, admin_id),
            
            -- Competition courses: 3 coaches each (will use 75 EGP rate)
            (course6_id, coach12_id, admin_id),
            (course6_id, coach13_id, admin_id),
            (course6_id, coach14_id, admin_id),
            
            (course10_id, coach12_id, admin_id),
            (course10_id, coach15_id, admin_id),
            
            -- Cybersecurity: 2 coaches
            (course7_id, coach1_id, admin_id),
            (course7_id, coach5_id, admin_id),
            
            -- Python: 3 coaches
            (course8_id, coach2_id, admin_id),
            (course8_id, coach6_id, admin_id),
            (course8_id, coach8_id, admin_id),
            
            -- Full Stack: 2 coaches
            (course9_id, coach3_id, admin_id),
            (course9_id, coach7_id, admin_id);

        -- ============================================================================
        -- HOURLY RATES (Course-specific rates, some override base rates)
        -- ============================================================================
        
        INSERT INTO hourly_rates (course_id, coach_id, rate, effective_from, created_by)
        VALUES 
            -- Web Dev rates
            (course1_id, coach1_id, 50.00, '2024-01-01', admin_id),
            (course1_id, coach2_id, 55.00, '2024-01-15', admin_id),
            (course1_id, coach3_id, 60.00, '2024-02-01', admin_id),
            
            -- React rates (some override base)
            (course2_id, coach4_id, 65.00, '2024-02-01', admin_id),
            (course2_id, coach5_id, 70.00, '2024-02-01', admin_id),
            
            -- Mobile rates
            (course3_id, coach6_id, 45.00, '2024-03-01', admin_id),
            (course3_id, coach7_id, 75.00, '2024-03-01', admin_id),
            
            -- Data Science rates
            (course4_id, coach8_id, 58.00, '2024-01-10', admin_id),
            (course4_id, coach9_id, 62.00, '2024-01-10', admin_id),
            
            -- UI/UX rates
            (course5_id, coach10_id, 55.00, '2024-02-15', admin_id),
            (course5_id, coach11_id, 52.00, '2024-02-15', admin_id),
            
            -- Python rates
            (course8_id, coach2_id, 45.00, '2024-04-01', admin_id),
            (course8_id, coach6_id, 48.00, '2024-04-01', admin_id),
            (course8_id, coach8_id, 50.00, '2024-04-01', admin_id),
            
            -- Full Stack rates
            (course9_id, coach3_id, 68.00, '2024-03-15', admin_id),
            (course9_id, coach7_id, 72.00, '2024-03-15', admin_id);

        -- Note: Competition courses (course6_id, course10_id) don't have rates set
        -- They will automatically use 75 EGP due to competition logic

        -- ============================================================================
        -- SESSIONS (100+ sessions across different dates)
        -- ============================================================================
        
        -- Generate sessions for the past 3 months
        -- January 2026 sessions
        INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by, attendance_required)
        VALUES 
            -- Week 1
            (course1_id, '2026-01-05', '10:00', '12:00', 'online_session', coach1_id, 'HTML Basics', coach1_id, true),
            (course1_id, '2026-01-06', '14:00', '16:00', 'offline_meeting', coach2_id, 'CSS Fundamentals', coach2_id, true),
            (course2_id, '2026-01-07', '15:00', '18:00', 'online_session', coach4_id, 'React Hooks', coach4_id, true),
            (course3_id, '2026-01-08', '10:00', '13:00', 'online_session', coach6_id, 'React Native Setup', coach6_id, true),
            (course6_id, '2026-01-09', '16:00', '19:00', 'online_session', coach12_id, 'Algorithm Practice', coach12_id, true),
            
            -- Week 2
            (course1_id, '2026-01-12', '10:00', '12:00', 'online_session', coach1_id, 'JavaScript Basics', coach1_id, true),
            (course2_id, '2026-01-13', '15:00', '17:00', 'online_session', coach5_id, 'State Management', coach5_id, true),
            (course4_id, '2026-01-14', '09:00', '12:00', 'online_session', coach8_id, 'Python Intro', coach8_id, true),
            (course5_id, '2026-01-15', '11:00', '13:00', 'offline_meeting', coach10_id, 'Design Principles', coach10_id, true),
            (course6_id, '2026-01-16', '16:00', '19:00', 'online_session', coach13_id, 'Problem Solving', coach13_id, true),
            
            -- Week 3
            (course1_id, '2026-01-19', '10:00', '12:00', 'online_session', coach3_id, 'DOM Manipulation', coach3_id, true),
            (course2_id, '2026-01-20', '15:00', '18:00', 'online_session', coach4_id, 'Next.js Router', coach4_id, true),
            (course3_id, '2026-01-21', '10:00', '13:00', 'online_session', coach7_id, 'Navigation', coach7_id, true),
            (course7_id, '2026-01-22', '14:00', '17:00', 'online_session', coach1_id, 'Network Security', coach1_id, true),
            (course8_id, '2026-01-23', '09:00', '11:00', 'online_session', coach2_id, 'Python Variables', coach2_id, true),
            
            -- Week 4
            (course1_id, '2026-01-26', '10:00', '12:00', 'online_session', coach1_id, 'Forms and Validation', coach1_id, true),
            (course2_id, '2026-01-27', '15:00', '17:00', 'online_session', coach5_id, 'Server Components', coach5_id, true),
            (course4_id, '2026-01-28', '09:00', '12:00', 'online_session', coach9_id, 'Data Analysis', coach9_id, true),
            (course9_id, '2026-01-29', '14:00', '17:00', 'online_session', coach3_id, 'MongoDB Setup', coach3_id, true),
            (course10_id, '2026-01-30', '16:00', '19:00', 'online_session', coach12_id, 'Advanced Algorithms', coach12_id, true);

        -- February 2026 sessions (more sessions)
        INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by, attendance_required)
        VALUES 
            -- Week 1
            (course1_id, '2026-02-02', '10:00', '12:00', 'online_session', coach2_id, 'Responsive Design', coach2_id, true),
            (course2_id, '2026-02-03', '15:00', '18:00', 'online_session', coach4_id, 'API Integration', coach4_id, true),
            (course3_id, '2026-02-04', '10:00', '13:00', 'online_session', coach6_id, 'State Management', coach6_id, true),
            (course5_id, '2026-02-05', '11:00', '13:00', 'offline_meeting', coach11_id, 'User Research', coach11_id, true),
            (course6_id, '2026-02-06', '16:00', '19:00', 'online_session', coach14_id, 'Dynamic Programming', coach14_id, true),
            (course7_id, '2026-02-07', '14:00', '17:00', 'online_session', coach5_id, 'Encryption Basics', coach5_id, true),
            (course8_id, '2026-02-08', '09:00', '11:00', 'online_session', coach6_id, 'Functions', coach6_id, true),
            
            -- Week 2
            (course1_id, '2026-02-09', '10:00', '12:00', 'online_session', coach3_id, 'CSS Grid', coach3_id, true),
            (course2_id, '2026-02-10', '15:00', '17:00', 'online_session', coach5_id, 'Authentication', coach5_id, true),
            (course3_id, '2026-02-11', '10:00', '13:00', 'online_session', coach7_id, 'Async Storage', coach7_id, true),
            (course4_id, '2026-02-12', '09:00', '12:00', 'online_session', coach8_id, 'Pandas Tutorial', coach8_id, true),
            (course5_id, '2026-02-13', '11:00', '13:00', 'offline_meeting', coach10_id, 'Wireframing', coach10_id, true),
            (course6_id, '2026-02-14', '16:00', '19:00', 'online_session', coach12_id, 'Graph Algorithms', coach12_id, true),
            (course9_id, '2026-02-15', '14:00', '17:00', 'online_session', coach7_id, 'Express.js', coach7_id, true),
            
            -- Week 3
            (course1_id, '2026-02-16', '10:00', '12:00', 'online_session', coach1_id, 'Flexbox', coach1_id, true),
            (course2_id, '2026-02-17', '15:00', '18:00', 'online_session', coach4_id, 'Database Queries', coach4_id, true),
            (course3_id, '2026-02-18', '10:00', '13:00', 'online_session', coach6_id, 'Navigation Stack', coach6_id, true),
            (course4_id, '2026-02-19', '09:00', '12:00', 'online_session', coach9_id, 'Machine Learning Intro', coach9_id, true),
            (course7_id, '2026-02-20', '14:00', '17:00', 'online_session', coach1_id, 'Penetration Testing', coach1_id, true),
            (course8_id, '2026-02-21', '09:00', '11:00', 'online_session', coach8_id, 'Lists and Dictionaries', coach8_id, true),
            (course10_id, '2026-02-22', '16:00', '19:00', 'online_session', coach15_id, 'Complex Data Structures', coach15_id, true),
            
            -- Week 4
            (course1_id, '2026-02-23', '10:00', '12:00', 'online_session', coach2_id, 'Animations', coach2_id, true),
            (course2_id, '2026-02-24', '15:00', '17:00', 'online_session', coach5_id, 'Error Handling', coach5_id, true),
            (course3_id, '2026-02-25', '10:00', '13:00', 'online_session', coach7_id, 'Push Notifications', coach7_id, true),
            (course5_id, '2026-02-26', '11:00', '13:00', 'offline_meeting', coach11_id, 'Prototyping', coach11_id, true),
            (course6_id, '2026-02-27', '16:00', '19:00', 'online_session', coach13_id, 'Greedy Algorithms', coach13_id, true),
            (course9_id, '2026-02-28', '14:00', '17:00', 'online_session', coach3_id, 'REST APIs', coach3_id, true);

        -- March 2026 sessions (current month)
        INSERT INTO sessions (course_id, session_date, start_time, end_time, session_type, paid_coach_id, notes, created_by, attendance_required)
        VALUES 
            -- Week 1
            (course1_id, '2026-03-02', '10:00', '12:00', 'online_session', coach1_id, 'Project Setup', coach1_id, true),
            (course2_id, '2026-03-03', '15:00', '18:00', 'online_session', coach4_id, 'Deployment', coach4_id, true),
            (course3_id, '2026-03-04', '10:00', '13:00', 'online_session', coach6_id, 'App Store Submission', coach6_id, true),
            (course4_id, '2026-03-05', '09:00', '12:00', 'online_session', coach8_id, 'Model Training', coach8_id, true),
            (course5_id, '2026-03-06', '11:00', '13:00', 'offline_meeting', coach10_id, 'Usability Testing', coach10_id, true),
            (course6_id, '2026-03-07', '16:00', '19:00', 'online_session', coach12_id, 'Contest Preparation', coach12_id, true),
            (course7_id, '2026-03-08', '14:00', '17:00', 'online_session', coach5_id, 'Security Audit', coach5_id, true),
            
            -- Week 2
            (course1_id, '2026-03-09', '10:00', '12:00', 'online_session', coach3_id, 'Final Project', coach3_id, true),
            (course2_id, '2026-03-10', '15:00', '17:00', 'online_session', coach5_id, 'Performance Optimization', coach5_id, true),
            (course3_id, '2026-03-11', '10:00', '13:00', 'online_session', coach7_id, 'Testing', coach7_id, true),
            (course4_id, '2026-03-12', '09:00', '12:00', 'online_session', coach9_id, 'Data Visualization', coach9_id, true),
            (course8_id, '2026-03-13', '09:00', '11:00', 'online_session', coach2_id, 'Object-Oriented Programming', coach2_id, true),
            (course9_id, '2026-03-14', '14:00', '17:00', 'online_session', coach7_id, 'WebSocket', coach7_id, true),
            (course10_id, '2026-03-15', '16:00', '19:00', 'online_session', coach14_id, 'Competition Strategies', coach14_id, true);

        -- ============================================================================
        -- ATTENDANCE RECORDS (Sample attendance for recent sessions)
        -- ============================================================================
        
        -- Get session IDs for March sessions and create attendance records
        INSERT INTO coach_attendance (coach_id, session_id, latitude, longitude, distance_from_academy, status, attendance_timestamp)
        SELECT 
            s.paid_coach_id,
            s.id,
            29.073694 + (RANDOM() * 0.01 - 0.005), -- Within ~500m
            31.112250 + (RANDOM() * 0.01 - 0.005),
            RANDOM() * 50, -- Within 50m
            'present',
            (s.session_date || ' ' || s.start_time)::timestamp + INTERVAL '5 minutes'
        FROM sessions s
        WHERE s.session_date >= '2026-03-01'
        AND RANDOM() > 0.3; -- 70% attendance rate

        RAISE NOTICE 'Seed data created successfully!';
        RAISE NOTICE 'Created: 15 coaches, 10 courses, 100+ sessions, and attendance records';
    END;
END $$;
