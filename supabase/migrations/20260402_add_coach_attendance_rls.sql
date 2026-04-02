-- Add RLS policies for coach_attendance table
-- Coaches need to be able to insert and update their own attendance records

-- Enable RLS on coach_attendance table
ALTER TABLE coach_attendance ENABLE ROW LEVEL SECURITY;

-- Admins can manage all coach attendance records
CREATE POLICY "Admins can manage all coach attendance"
    ON coach_attendance FOR ALL
    USING (is_admin());

-- Coaches can insert their own attendance records
CREATE POLICY "Coaches can insert their own attendance"
    ON coach_attendance FOR INSERT
    WITH CHECK (coach_id = auth.uid());

-- Coaches can update their own attendance records
CREATE POLICY "Coaches can update their own attendance"
    ON coach_attendance FOR UPDATE
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- Coaches can view their own attendance records
CREATE POLICY "Coaches can view their own attendance"
    ON coach_attendance FOR SELECT
    USING (coach_id = auth.uid() OR is_admin());
