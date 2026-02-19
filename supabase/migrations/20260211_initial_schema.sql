-- Treeks Land Database Schema
-- Complete migration for session tracking and invoicing system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'coach');
CREATE TYPE course_status AS ENUM ('active', 'archived');
CREATE TYPE session_type AS ENUM ('online_session', 'offline_meeting');
CREATE TYPE adjustment_type AS ENUM ('bonus', 'discount');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'coach',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status course_status NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course coaches assignment (many-to-many)
CREATE TABLE course_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, coach_id)
);

-- Course students (just names, no auth)
CREATE TABLE course_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hourly rates (per course-coach pair with history)
-- UPDATED: This now supports different rates for different courses for the same coach
CREATE TABLE hourly_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rate NUMERIC(10, 2) NOT NULL CHECK (rate > 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, coach_id, effective_from)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    session_type session_type NOT NULL DEFAULT 'online_session',
    
    -- Replacement coach support
    originally_scheduled_coach_id UUID REFERENCES profiles(id),
    paid_coach_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Computed fields (set by trigger)
    computed_hours NUMERIC(5, 2),
    applied_rate NUMERIC(10, 2),
    subtotal NUMERIC(10, 2),
    
    notes TEXT,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Adjustments (bonuses/discounts)
CREATE TABLE adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Format: YYYY-MM
    type adjustment_type NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    notes TEXT NOT NULL, -- Required for transparency
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_created_by ON courses(created_by);

CREATE INDEX idx_course_coaches_course ON course_coaches(course_id);
CREATE INDEX idx_course_coaches_coach ON course_coaches(coach_id);

CREATE INDEX idx_course_students_course ON course_students(course_id);

CREATE INDEX idx_hourly_rates_course_coach ON hourly_rates(course_id, coach_id);
CREATE INDEX idx_hourly_rates_effective_from ON hourly_rates(effective_from);

CREATE INDEX idx_sessions_course ON sessions(course_id);
CREATE INDEX idx_sessions_paid_coach ON sessions(paid_coach_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
-- Note: Removed DATE_TRUNC index - use session_date index instead for monthly queries

CREATE INDEX idx_adjustments_coach ON adjustments(coach_id);
CREATE INDEX idx_adjustments_month ON adjustments(month);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get correct hourly rate for a session
-- UPDATED: Now looks up rate based on course_id + coach_id + session_date
CREATE OR REPLACE FUNCTION get_hourly_rate(
    p_course_id UUID,
    p_coach_id UUID,
    p_session_date DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    -- Get the most recent rate effective on or before the session date
    -- for this specific course-coach combination
    SELECT rate INTO v_rate
    FROM hourly_rates
    WHERE course_id = p_course_id
      AND coach_id = p_coach_id
      AND effective_from <= p_session_date
    ORDER BY effective_from DESC
    LIMIT 1;
    
    -- If no rate found, return 0 (will cause validation errors, which is good)
    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger function to compute session fields
CREATE OR REPLACE FUNCTION compute_session_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_hours NUMERIC;
    v_rate NUMERIC;
BEGIN
    -- Calculate hours (end_time - start_time)
    v_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;
    
    -- Get the correct rate for this course-coach pair at the session date
    v_rate := get_hourly_rate(NEW.course_id, NEW.paid_coach_id, NEW.session_date);
    
    -- Set computed fields
    NEW.computed_hours := ROUND(v_hours, 2);
    NEW.applied_rate := v_rate;
    NEW.subtotal := ROUND(v_hours * v_rate, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated timestamp triggers
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_courses
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_course_students
    BEFORE UPDATE ON course_students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_sessions
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_adjustments
    BEFORE UPDATE ON adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Session computation trigger
CREATE TRIGGER compute_session_fields_trigger
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION compute_session_fields();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- COURSES policies
CREATE POLICY "Admins can do anything with courses"
    ON courses FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view courses assigned to them"
    ON courses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = courses.id AND coach_id = auth.uid()
        )
    );

-- COURSE_COACHES policies
CREATE POLICY "Admins can manage course assignments"
    ON course_coaches FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view their assignments"
    ON course_coaches FOR SELECT
    USING (coach_id = auth.uid());

-- COURSE_STUDENTS policies
CREATE POLICY "Admins can manage all students"
    ON course_students FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view students in their courses"
    ON course_students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = course_students.course_id AND coach_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can manage students in their courses"
    ON course_students FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = course_students.course_id AND coach_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can update students in their courses"
    ON course_students FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = course_students.course_id AND coach_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can delete students in their courses"
    ON course_students FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = course_students.course_id AND coach_id = auth.uid()
        )
    );

-- HOURLY_RATES policies
CREATE POLICY "Everyone can view rates for their courses"
    ON hourly_rates FOR SELECT
    USING (
        is_admin() OR
        coach_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = hourly_rates.course_id AND coach_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all rates"
    ON hourly_rates FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update rates"
    ON hourly_rates FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete rates"
    ON hourly_rates FOR DELETE
    USING (is_admin());

-- SESSIONS policies
CREATE POLICY "Admins can manage all sessions"
    ON sessions FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view their own sessions"
    ON sessions FOR SELECT
    USING (paid_coach_id = auth.uid());

CREATE POLICY "Coaches can insert their own sessions"
    ON sessions FOR INSERT
    WITH CHECK (paid_coach_id = auth.uid());

CREATE POLICY "Coaches can update their own current month sessions"
    ON sessions FOR UPDATE
    USING (
        paid_coach_id = auth.uid() AND
        DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_DATE)
    );

CREATE POLICY "Coaches can delete their own current month sessions"
    ON sessions FOR DELETE
    USING (
        paid_coach_id = auth.uid() AND
        DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_DATE)
    );

-- ADJUSTMENTS policies
CREATE POLICY "Admins can manage all adjustments"
    ON adjustments FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view their own adjustments"
    ON adjustments FOR SELECT
    USING (coach_id = auth.uid());

-- ============================================================================
-- HELPER VIEWS (Optional but useful)
-- ============================================================================

-- View for coach monthly totals
CREATE OR REPLACE VIEW coach_monthly_totals AS
SELECT 
    s.paid_coach_id AS coach_id,
    p.full_name AS coach_name,
    TO_CHAR(s.session_date, 'YYYY-MM') AS month,
    COUNT(*) AS session_count,
    SUM(s.computed_hours) AS total_hours,
    SUM(s.subtotal) AS gross_total,
    COALESCE(SUM(CASE WHEN a.type = 'bonus' THEN a.amount ELSE 0 END), 0) AS total_bonuses,
    COALESCE(SUM(CASE WHEN a.type = 'discount' THEN a.amount ELSE 0 END), 0) AS total_discounts,
    SUM(s.subtotal) + 
    COALESCE(SUM(CASE WHEN a.type = 'bonus' THEN a.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN a.type = 'discount' THEN a.amount ELSE 0 END), 0) AS net_total
FROM sessions s
INNER JOIN profiles p ON p.id = s.paid_coach_id
LEFT JOIN adjustments a ON a.coach_id = s.paid_coach_id 
    AND a.month = TO_CHAR(s.session_date, 'YYYY-MM')
GROUP BY s.paid_coach_id, p.full_name, TO_CHAR(s.session_date, 'YYYY-MM');

-- ============================================================================
-- INITIAL DATA (Optional - for testing only)
-- ============================================================================

-- Note: Actual user accounts must be created through Supabase Auth
-- This is just a comment showing how the system expects data

/*
Example workflow after migration:

1. Create users via Supabase Auth dashboard or API
2. Insert profiles for each user:
   INSERT INTO profiles (id, full_name, email, role)
   VALUES (auth_user_id, 'Admin Name', 'admin@tricksland.com', 'admin');

3. Create courses:
   INSERT INTO courses (name, description, created_by)
   VALUES ('Web Development', 'Full stack web development course', admin_id);

4. Assign coaches to courses:
   INSERT INTO course_coaches (course_id, coach_id, assigned_by)
   VALUES (course_id, coach_id, admin_id);

5. Set hourly rates:
   INSERT INTO hourly_rates (course_id, coach_id, rate, effective_from, created_by)
   VALUES (course_id, coach_id, 50.00, '2026-02-01', admin_id);
*/
