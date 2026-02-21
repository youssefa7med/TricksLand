-- Add marked_by_admin column to coach_attendance table
-- Allows admin to manually mark a coach as attended (bypasses GPS check)

ALTER TABLE coach_attendance
    ADD COLUMN IF NOT EXISTS marked_by_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN coach_attendance.marked_by_admin IS
    'If true, this record was created manually by an admin, not via GPS check-in.';

-- Ensure admin can manage all attendance records
-- (in case RLS is also enabled on coach_attendance)
DO $$
BEGIN
    -- Drop the policy if it already exists before re-creating it
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'coach_attendance'
          AND policyname = 'Admins can manage all attendance'
    ) THEN
        EXECUTE 'DROP POLICY "Admins can manage all attendance" ON coach_attendance';
    END IF;

    EXECUTE '
        CREATE POLICY "Admins can manage all attendance"
            ON coach_attendance FOR ALL
            USING (is_admin())
    ';
END $$;
