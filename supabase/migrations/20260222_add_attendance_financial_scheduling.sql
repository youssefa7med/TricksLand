-- TricksLand Enhancement Migration
-- Date: 2026-02-22
-- Adds: Enhanced attendance, financial tracking, course scheduling, admin settings

-- ============================================================================
-- ENUMS (add new session status types)
-- ============================================================================

-- Extend session_status enum for course scheduling
CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'postponed', 'cancelled', 'extra');

-- Payment status for student payments
CREATE TYPE payment_status AS ENUM ('not_paid', 'partially_paid', 'paid');

-- ============================================================================
-- ENHANCED STUDENT ATTENDANCE TABLE
-- ============================================================================

-- Track student attendance per session with arrival/leaving times
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    
    -- Attendance status
    status VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late')),
    
    -- Time tracking (optional - for geolocation check-in)
    arrival_time TIME,
    leaving_time TIME,
    
    -- Computed duration in minutes
    duration_minutes INTEGER,
    
    -- Who marked attendance
    marked_by UUID NOT NULL REFERENCES profiles(id),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per student per session
    UNIQUE(session_id, student_id)
);

CREATE INDEX idx_student_attendance_session ON student_attendance(session_id);
CREATE INDEX idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX idx_student_attendance_course ON student_attendance(course_id);
CREATE INDEX idx_student_attendance_date ON student_attendance(attendance_date);

-- ============================================================================
-- COURSE SCHEDULING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Scheduling parameters
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    sessions_per_week INTEGER NOT NULL CHECK (sessions_per_week > 0),
    start_date DATE NOT NULL,
    scheduled_end_date DATE NOT NULL,
    actual_end_date DATE,
    
    -- Tracking
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    sessions_cancelled INTEGER NOT NULL DEFAULT 0,
    sessions_postponed INTEGER NOT NULL DEFAULT 0,
    extra_sessions_added INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_schedules_course ON course_schedules(course_id);
CREATE INDEX idx_course_schedules_status ON course_schedules(status);

-- ============================================================================
-- SESSION STATUS TRACKING (for course scheduling)
-- ============================================================================

-- Extend sessions table with scheduling status (using migration approach)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS session_status session_status NOT NULL DEFAULT 'completed';

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- COURSE EXPENSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Expense details
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    
    -- Category for reporting
    category VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (category IN ('instructor', 'materials', 'venue', 'equipment', 'marketing', 'other')),
    
    -- Who tracked it
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_expenses_course ON course_expenses(course_id);
CREATE INDEX idx_course_expenses_date ON course_expenses(expense_date);
CREATE INDEX idx_course_expenses_category ON course_expenses(category);

-- ============================================================================
-- STUDENT PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Payment details
    course_fee NUMERIC(10, 2) NOT NULL CHECK (course_fee > 0),
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    remaining_balance NUMERIC(10, 2) NOT NULL GENERATED ALWAYS AS (course_fee - amount_paid) STORED,
    
    -- Payment status
    payment_status payment_status NOT NULL DEFAULT 'not_paid',
    
    -- Payment date
    first_payment_date DATE,
    last_payment_date DATE,
    due_date DATE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, course_id)
);

CREATE INDEX idx_student_payments_student ON student_payments(student_id);
CREATE INDEX idx_student_payments_course ON student_payments(course_id);
CREATE INDEX idx_student_payments_status ON student_payments(payment_status);

-- ============================================================================
-- PAYMENT TRANSACTIONS (history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_record_id UUID NOT NULL REFERENCES student_payments(id) ON DELETE CASCADE,
    
    -- Transaction details
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
    
    -- Payment method
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check', 'other')),
    
    -- Reference
    reference_number TEXT,
    notes TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_payment_record ON payment_transactions(payment_record_id);
CREATE INDEX idx_payment_transactions_date ON payment_transactions(transaction_date);

-- ============================================================================
-- ADMIN SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'integer', 'float', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO admin_settings (key, value, value_type, description, is_public)
VALUES
    ('geolocation_radius_meters', '60', 'integer', 'Allowed radius for attendance check-in in meters', false),
    ('quarter_hour_increment', '15', 'integer', 'Billing increment in minutes (quarter hour = 15)', false),
    ('default_course_fee', '0', 'float', 'Default course fee for new students in EGP', false),
    ('platform_name', 'TricksLand Academy', 'string', 'Platform display name', true)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================================
-- HELPER FUNCTION: Calculate billable hours from time duration
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_billable_hours(
    p_arrival_time TIME,
    p_leaving_time TIME
)
RETURNS NUMERIC AS $$
DECLARE
    v_duration_minutes INTEGER;
    v_billed_quarters INTEGER;
BEGIN
    -- Calculate duration in minutes
    v_duration_minutes := EXTRACT(EPOCH FROM (p_leaving_time - p_arrival_time))::INTEGER / 60;
    
    -- If less than 15 minutes, return 0
    IF v_duration_minutes < 15 THEN
        RETURN 0;
    END IF;
    
    -- Round up to nearest quarter hour (15 minutes)
    v_billed_quarters := CEIL(v_duration_minutes::NUMERIC / 15)::INTEGER;
    
    -- Convert quarters to hours (each quarter = 0.25 hours)
    RETURN v_billed_quarters * 0.25;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- HELPER FUNCTION: Get admin setting value
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_setting(
    p_key VARCHAR,
    p_default_value TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value
    FROM admin_settings
    WHERE key = p_key;
    
    RETURN COALESCE(v_value, p_default_value);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Auto-update student_payments status after payment transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update payment status based on amount paid
    UPDATE student_payments
    SET 
        payment_status = CASE
            WHEN amount_paid <= 0 THEN 'not_paid'::payment_status
            WHEN amount_paid < course_fee THEN 'partially_paid'::payment_status
            ELSE 'paid'::payment_status
        END,
        last_payment_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = NEW.payment_record_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_payment_status_on_transaction
AFTER INSERT ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- ============================================================================
-- TRIGGER: Auto-calculate duration_minutes in student_attendance
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_attendance_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.arrival_time IS NOT NULL AND NEW.leaving_time IS NOT NULL THEN
        NEW.duration_minutes := (EXTRACT(EPOCH FROM (NEW.leaving_time - NEW.arrival_time))::INTEGER / 60);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_attendance_duration
BEFORE INSERT OR UPDATE ON student_attendance
FOR EACH ROW
EXECUTE FUNCTION calculate_attendance_duration();

-- ============================================================================
-- RLS POLICIES: student_attendance
-- ============================================================================

ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all student attendance"
    ON student_attendance FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can mark attendance for their students"
    ON student_attendance FOR INSERT
    WITH CHECK (
        is_admin() OR 
        EXISTS (
            SELECT 1 FROM course_coaches cc
            WHERE cc.coach_id = auth.uid() 
            AND cc.course_id = student_attendance.course_id
        )
    );

CREATE POLICY "Coaches can update attendance for their courses"
    ON student_attendance FOR UPDATE
    USING (
        is_admin() OR 
        EXISTS (
            SELECT 1 FROM course_coaches cc
            WHERE cc.coach_id = auth.uid() 
            AND cc.course_id = student_attendance.course_id
        )
    );

CREATE POLICY "Students can view their own attendance"
    ON student_attendance FOR SELECT
    USING (student_id = auth.uid() OR is_admin());

-- ============================================================================
-- RLS POLICIES: course_schedules
-- ============================================================================

ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course schedules"
    ON course_schedules FOR ALL
    USING (is_admin());

CREATE POLICY "Coaches can view schedules for assigned courses"
    ON course_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_coaches cc
            WHERE cc.coach_id = auth.uid() 
            AND cc.course_id = course_schedules.course_id
        )
    );

-- ============================================================================
-- RLS POLICIES: course_expenses
-- ============================================================================

ALTER TABLE course_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course expenses"
    ON course_expenses FOR ALL
    USING (is_admin());

-- No coach access to expenses (financial data restricted)

-- ============================================================================
-- RLS POLICIES: student_payments
-- ============================================================================

ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all student payments"
    ON student_payments FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert student payments"
    ON student_payments FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update student payments"
    ON student_payments FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admins can delete student payments"
    ON student_payments FOR DELETE
    USING (is_admin());

-- Students can view their own payments (only balance, not financial details)
CREATE POLICY "Students can view their own payment records"
    ON student_payments FOR SELECT
    USING (student_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: payment_transactions
-- ============================================================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment transactions"
    ON payment_transactions FOR ALL
    USING (is_admin());

-- No coach/student access to transaction details

-- ============================================================================
-- RLS POLICIES: admin_settings
-- ============================================================================

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can modify settings"
    ON admin_settings FOR ALL
    USING (is_admin());

CREATE POLICY "Anyone can view public settings"
    ON admin_settings FOR SELECT
    USING (is_public = true);

-- ============================================================================
-- HELPER VIEW: Student monthly attendance summary
-- ============================================================================

CREATE OR REPLACE VIEW student_monthly_attendance AS
SELECT 
    sa.student_id,
    p.full_name AS student_name,
    sa.course_id,
    c.name AS course_name,
    TO_CHAR(sa.attendance_date, 'YYYY-MM') AS month,
    COUNT(*) AS total_sessions,
    COUNT(CASE WHEN sa.status = 'present' THEN 1 END) AS sessions_attended,
    COUNT(CASE WHEN sa.status = 'absent' THEN 1 END) AS sessions_absent,
    COUNT(CASE WHEN sa.status = 'late' THEN 1 END) AS sessions_late,
    ROUND(100.0 * COUNT(CASE WHEN sa.status = 'present' THEN 1 END) / COUNT(*), 2) AS attendance_percentage
FROM student_attendance sa
JOIN profiles p ON sa.student_id = p.id
JOIN courses c ON sa.course_id = c.id
GROUP BY sa.student_id, p.full_name, sa.course_id, c.name, TO_CHAR(sa.attendance_date, 'YYYY-MM');

-- ============================================================================
-- HELPER VIEW: Course financial summary
-- ============================================================================

CREATE OR REPLACE VIEW course_financial_summary AS
SELECT 
    c.id AS course_id,
    c.name AS course_name,
    -- Income
    COALESCE(SUM(sp.course_fee), 0) AS total_course_fees,
    COALESCE(SUM(sp.amount_paid), 0) AS total_income,
    COALESCE(SUM(sp.remaining_balance), 0) AS pending_income,
    -- Expenses
    COALESCE(SUM(ce.amount), 0) AS total_expenses,
    -- Net profit
    COALESCE(SUM(sp.amount_paid), 0) - COALESCE(SUM(ce.amount), 0) AS net_profit,
    -- Counts
    COUNT(DISTINCT sp.student_id) AS total_students,
    COUNT(CASE WHEN sp.payment_status = 'paid' THEN 1 END) AS students_paid,
    COUNT(CASE WHEN sp.payment_status = 'partially_paid' THEN 1 END) AS students_partially_paid,
    COUNT(CASE WHEN sp.payment_status = 'not_paid' THEN 1 END) AS students_not_paid
FROM courses c
LEFT JOIN student_payments sp ON c.id = sp.course_id
LEFT JOIN course_expenses ce ON c.id = ce.course_id
GROUP BY c.id, c.name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE student_attendance IS 'Enhanced student attendance tracking per session with arrival/leaving times and status';
COMMENT ON TABLE course_schedules IS 'Dynamic course scheduling with session planning and tracking';
COMMENT ON TABLE course_expenses IS 'Course expenses for financial tracking and profit calculation';
COMMENT ON TABLE student_payments IS 'Student payment records with balance tracking and payment status';
COMMENT ON TABLE payment_transactions IS 'Individual payment transactions for audit trail and history';
COMMENT ON TABLE admin_settings IS 'Configurable system settings accessible to admins only';
COMMENT ON FUNCTION calculate_billable_hours IS 'Calculate billable hours in quarter-hour increments (minimum 15 minutes)';
COMMENT ON FUNCTION get_admin_setting IS 'Retrieve admin setting by key with optional default value';
