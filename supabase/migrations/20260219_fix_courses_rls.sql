-- Fix: Coaches can also see courses where they are the paid_coach in a logged session.
-- This covers the case where an admin logs a session for a coach on a course
-- the coach was not formally assigned to via course_coaches.

DROP POLICY IF EXISTS "Coaches can view courses assigned to them" ON courses;

CREATE POLICY "Coaches can view courses assigned to them"
    ON courses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_coaches
            WHERE course_id = courses.id AND coach_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM sessions
            WHERE course_id = courses.id AND paid_coach_id = auth.uid()
        )
    );
