-- GPS-Based Attendance System for Coaches
-- Tracks when coaches mark attendance for sessions with location verification

-- Create enum for attendance status
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'excused');

-- Create coach_attendance table
CREATE TABLE coach_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Location data
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    distance_from_academy NUMERIC(6, 2) NOT NULL, -- meters
    
    -- Timestamp
    attendance_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status
    status attendance_status NOT NULL DEFAULT 'present',
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(coach_id, session_id, DATE(attendance_timestamp)),
    CONSTRAINT distance_reasonable CHECK (distance_from_academy >= 0 AND distance_from_academy <= 10000),
    CONSTRAINT coords_valid CHECK (latitude >= -90 AND latitude <= 90 AND longitude >= -180 AND longitude <= 180)
);

-- Create index for fast lookups
CREATE INDEX idx_coach_attendance_coach ON coach_attendance(coach_id);
CREATE INDEX idx_coach_attendance_session ON coach_attendance(session_id);
CREATE INDEX idx_coach_attendance_date ON coach_attendance(DATE(attendance_timestamp));
CREATE INDEX idx_coach_attendance_lookup ON coach_attendance(coach_id, session_id, DATE(attendance_timestamp));

-- Store academy location constants for reference
CREATE TABLE academy_location (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'TricksLand Steam Academy',
    latitude NUMERIC(10, 8) NOT NULL DEFAULT 29.073694,
    longitude NUMERIC(11, 8) NOT NULL DEFAULT 31.112250,
    allowed_radius_meters INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default academy location
INSERT INTO academy_location (name, latitude, longitude, allowed_radius_meters)
VALUES ('TricksLand Steam Academy', 29.073694, 31.112250, 50)
ON CONFLICT DO NOTHING;

-- Create function to calculate Haversine distance (in meters)
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 NUMERIC,
    lon1 NUMERIC,
    lat2 NUMERIC,
    lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    earth_radius_meters NUMERIC := 6371000; -- Earth radius in meters
    lat1_rad NUMERIC;
    lon1_rad NUMERIC;
    lat2_rad NUMERIC;
    lon2_rad NUMERIC;
    dlat NUMERIC;
    dlon NUMERIC;
    a NUMERIC;
    c NUMERIC;
    distance NUMERIC;
BEGIN
    -- Convert to radians
    lat1_rad := RADIANS(lat1);
    lon1_rad := RADIANS(lon1);
    lat2_rad := RADIANS(lat2);
    lon2_rad := RADIANS(lon2);
    
    -- Calculate differences
    dlat := lat2_rad - lat1_rad;
    dlon := lon2_rad - lon1_rad;
    
    -- Haversine formula
    a := SIN(dlat/2)^2 + COS(lat1_rad) * COS(lat2_rad) * SIN(dlon/2)^2;
    c := 2 * ASIN(SQRT(a));
    distance := earth_radius_meters * c;
    
    RETURN ROUND(distance, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update trigger for coach_attendance
CREATE TRIGGER set_updated_at_coach_attendance
    BEFORE UPDATE ON coach_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Policy for RLS (if using)
-- Coaches can only view/insert their own attendance
-- Only authenticated coaches can access
