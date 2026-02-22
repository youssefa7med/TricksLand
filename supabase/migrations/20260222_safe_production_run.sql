-- ============================================================
-- TricksLand Enhancement Migration — SAFE FOR PRODUCTION
-- Run this in Supabase Dashboard → SQL Editor
-- Date: 2026-02-22
-- ============================================================

-- ============================================================
-- 1. ENUMS (safe creation)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'postponed', 'cancelled', 'extra');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('not_paid', 'partially_paid', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. STUDENT ATTENDANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late')),
    arrival_time TIME,
    leaving_time TIME,
    duration_minutes INTEGER,
    marked_by UUID NOT NULL REFERENCES profiles(id),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_session ON student_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_course ON student_attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance(attendance_date);

-- ============================================================
-- 3. COURSE SCHEDULES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS course_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    sessions_per_week INTEGER NOT NULL CHECK (sessions_per_week > 0),
    start_date DATE NOT NULL,
    scheduled_end_date DATE NOT NULL,
    actual_end_date DATE,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    sessions_cancelled INTEGER NOT NULL DEFAULT 0,
    sessions_postponed INTEGER NOT NULL DEFAULT 0,
    extra_sessions_added INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_schedules_course ON course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_status ON course_schedules(status);

-- ============================================================
-- 4. EXTEND SESSIONS TABLE (add scheduling columns)
-- ============================================================

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS session_status session_status NOT NULL DEFAULT 'completed';

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- ============================================================
-- 5. COURSE EXPENSES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS course_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (category IN ('instructor', 'materials', 'venue', 'equipment', 'marketing', 'other')),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_expenses_course ON course_expenses(course_id);
CREATE INDEX IF NOT EXISTS idx_course_expenses_date ON course_expenses(expense_date);

-- ============================================================
-- 6. STUDENT PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS student_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_fee NUMERIC(10, 2) NOT NULL CHECK (course_fee > 0),
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    remaining_balance NUMERIC(10, 2) NOT NULL GENERATED ALWAYS AS (course_fee - amount_paid) STORED,
    payment_status payment_status NOT NULL DEFAULT 'not_paid',
    first_payment_date DATE,
    last_payment_date DATE,
    due_date DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_payments_student ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_course ON student_payments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_status ON student_payments(payment_status);

-- ============================================================
-- 7. PAYMENT TRANSACTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_record_id UUID NOT NULL REFERENCES student_payments(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check', 'other')),
    reference_number TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_record ON payment_transactions(payment_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(transaction_date);

-- ============================================================
-- 8. ADMIN SETTINGS TABLE
-- ============================================================

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

INSERT INTO admin_settings (key, value, value_type, description, is_public)
VALUES
    ('geolocation_radius_meters', '60', 'integer', 'Allowed radius for attendance check-in in meters', false),
    ('quarter_hour_increment', '15', 'integer', 'Billing increment in minutes', false),
    ('default_course_fee', '0', 'float', 'Default course fee for new students', false),
    ('platform_name', 'TricksLand Academy', 'string', 'Platform display name', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================================
-- 9. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_billable_hours(
    p_arrival_time TIME,
    p_leaving_time TIME
)
RETURNS NUMERIC AS $$
DECLARE
    v_duration_minutes INTEGER;
    v_billed_quarters INTEGER;
BEGIN
    v_duration_minutes := EXTRACT(EPOCH FROM (p_leaving_time - p_arrival_time))::INTEGER / 60;
    IF v_duration_minutes < 15 THEN RETURN 0; END IF;
    v_billed_quarters := CEIL(v_duration_minutes::NUMERIC / 15)::INTEGER;
    RETURN v_billed_quarters * 0.25;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_admin_setting(p_key VARCHAR, p_default_value TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE v_value TEXT;
BEGIN
    SELECT value INTO v_value FROM admin_settings WHERE key = p_key;
    RETURN COALESCE(v_value, p_default_value);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 10. TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trigger_update_payment_status_on_transaction ON payment_transactions;
CREATE TRIGGER trigger_update_payment_status_on_transaction
AFTER INSERT ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION update_payment_status();

CREATE OR REPLACE FUNCTION calculate_attendance_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.arrival_time IS NOT NULL AND NEW.leaving_time IS NOT NULL THEN
        NEW.duration_minutes := (EXTRACT(EPOCH FROM (NEW.leaving_time - NEW.arrival_time))::INTEGER / 60);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_attendance_duration ON student_attendance;
CREATE TRIGGER trigger_calculate_attendance_duration
BEFORE INSERT OR UPDATE ON student_attendance
FOR EACH ROW EXECUTE FUNCTION calculate_attendance_duration();

-- ============================================================
-- 11. RLS POLICIES — student_attendance
-- ============================================================

ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all student attendance" ON student_attendance;
CREATE POLICY "Admins can manage all student attendance"
    ON student_attendance FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Coaches can mark attendance for their students" ON student_attendance;
CREATE POLICY "Coaches can mark attendance for their students"
    ON student_attendance FOR INSERT
    WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM course_coaches cc
            WHERE cc.coach_id = auth.uid() AND cc.course_id = student_attendance.course_id
        )
    );

DROP POLICY IF EXISTS "Coaches can update attendance for their courses" ON student_attendance;
CREATE POLICY "Coaches can update attendance for their courses"
    ON student_attendance FOR UPDATE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM course_coaches cc
            WHERE cc.coach_id = auth.uid() AND cc.course_id = student_attendance.course_id
        )
    );

DROP POLICY IF EXISTS "Students can view their own attendance" ON student_attendance;
CREATE POLICY "Students can view their own attendance"
    ON student_attendance FOR SELECT
    USING (student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Coaches can view attendance for their courses" ON student_attendance;
CREATE POLICY "Coaches can view attendance for their courses"
    ON student_attendance FOR SELECT
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM course_coaches cc
            WHERE cc.coach_id = auth.uid() AND cc.course_id = student_attendance.course_id
        )
    );

-- ============================================================
-- 12. RLS POLICIES — course_schedules
-- ============================================================

ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage course schedules" ON course_schedules;
CREATE POLICY "Admins can manage course schedules"
    ON course_schedules FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Coaches can view schedules" ON course_schedules;
CREATE POLICY "Coaches can view schedules"
    ON course_schedules FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM course_coaches cc
        WHERE cc.coach_id = auth.uid() AND cc.course_id = course_schedules.course_id
    ));

-- ============================================================
-- 13. RLS POLICIES — course_expenses (admin only)
-- ============================================================

ALTER TABLE course_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage course expenses" ON course_expenses;
CREATE POLICY "Admins can manage course expenses"
    ON course_expenses FOR ALL USING (is_admin());

-- ============================================================
-- 14. RLS POLICIES — student_payments (admin only)
-- ============================================================

ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all student payments" ON student_payments;
CREATE POLICY "Admins can view all student payments"
    ON student_payments FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert student payments" ON student_payments;
CREATE POLICY "Admins can insert student payments"
    ON student_payments FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update student payments" ON student_payments;
CREATE POLICY "Admins can update student payments"
    ON student_payments FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete student payments" ON student_payments;
CREATE POLICY "Admins can delete student payments"
    ON student_payments FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Students can view own payment records" ON student_payments;
CREATE POLICY "Students can view own payment records"
    ON student_payments FOR SELECT USING (student_id = auth.uid());

-- ============================================================
-- 15. RLS POLICIES — payment_transactions (admin only)
-- ============================================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage payment transactions" ON payment_transactions;
CREATE POLICY "Admins can manage payment transactions"
    ON payment_transactions FOR ALL USING (is_admin());

-- ============================================================
-- 16. RLS POLICIES — admin_settings
-- ============================================================

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can modify settings" ON admin_settings;
CREATE POLICY "Only admins can modify settings"
    ON admin_settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Anyone can view public settings" ON admin_settings;
CREATE POLICY "Anyone can view public settings"
    ON admin_settings FOR SELECT USING (is_public = true);

-- ============================================================
-- 17. VIEWS
-- ============================================================

-- security_invoker = true: view runs with the CALLER's identity so RLS on
-- student_attendance is evaluated per-user (not as the view owner).
DROP VIEW IF EXISTS public.student_monthly_attendance;
CREATE VIEW public.student_monthly_attendance
WITH (security_invoker = true)
AS
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

-- security_invoker = true: financial data is admin-only via RLS on underlying
-- tables; security invoker ensures those policies are always enforced.
DROP VIEW IF EXISTS public.course_financial_summary;
CREATE VIEW public.course_financial_summary
WITH (security_invoker = true)
AS
SELECT
    c.id AS course_id,
    c.name AS course_name,
    COALESCE(SUM(DISTINCT sp.course_fee), 0) AS total_course_fees,
    COALESCE(SUM(DISTINCT sp.amount_paid), 0) AS total_income,
    COALESCE(SUM(DISTINCT sp.remaining_balance), 0) AS pending_income,
    COALESCE((SELECT SUM(ce2.amount) FROM course_expenses ce2 WHERE ce2.course_id = c.id), 0) AS total_expenses,
    COALESCE(SUM(DISTINCT sp.amount_paid), 0) - COALESCE((SELECT SUM(ce2.amount) FROM course_expenses ce2 WHERE ce2.course_id = c.id), 0) AS net_profit,
    COUNT(DISTINCT sp.student_id) AS total_students,
    COUNT(DISTINCT CASE WHEN sp.payment_status = 'paid' THEN sp.id END) AS students_paid,
    COUNT(DISTINCT CASE WHEN sp.payment_status = 'partially_paid' THEN sp.id END) AS students_partially_paid,
    COUNT(DISTINCT CASE WHEN sp.payment_status = 'not_paid' THEN sp.id END) AS students_not_paid
FROM courses c
LEFT JOIN student_payments sp ON c.id = sp.course_id
GROUP BY c.id, c.name;

-- ============================================================
-- DONE
-- ============================================================
SELECT 'Migration completed successfully!' AS result;
