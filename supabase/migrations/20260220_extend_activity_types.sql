-- Extend session_type enum to support multiple activity types
-- This migration adds support for Training, Consultation, and other activity types

-- Add new values to session_type enum
ALTER TYPE session_type ADD VALUE 'training' AFTER 'offline_meeting';
ALTER TYPE session_type ADD VALUE 'consultation' AFTER 'training';
ALTER TYPE session_type ADD VALUE 'workshop' AFTER 'consultation';
ALTER TYPE session_type ADD VALUE 'tutoring' AFTER 'workshop';
ALTER TYPE session_type ADD VALUE 'other' AFTER 'tutoring';

-- Add activity_type column if it doesn't exist (for future use)
-- This can be used to further categorize activities
-- ALTER TABLE sessions ADD COLUMN activity_category TEXT DEFAULT 'default';

-- Create a type_display mapping table for translations and display info
CREATE TABLE IF NOT EXISTS activity_type_display (
    type_value TEXT PRIMARY KEY,
    display_name_en TEXT NOT NULL,
    display_name_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    color_badge TEXT DEFAULT 'gray',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed activity type display information
INSERT INTO activity_type_display (type_value, display_name_en, display_name_ar, description_en, description_ar, color_badge) 
VALUES 
    ('online_session', 'Online Session', 'جلسة أونلاين', 'Virtual online session', 'جلسة افتراضية عبر الإنترنت', 'blue'),
    ('offline_meeting', 'Offline Meeting', 'ميتنج أوفلاين', 'In-person meeting', 'اجتماع وجهاً لوجه', 'green'),
    ('training', 'Training', 'تدريب', 'Training session or workshop', 'جلسة تدريبية', 'purple'),
    ('consultation', 'Consultation', 'استشارة', 'One-on-one consultation', 'استشارة فردية', 'orange'),
    ('workshop', 'Workshop', 'ورشة عمل', 'Group workshop', 'ورشة عمل جماعية', 'indigo'),
    ('tutoring', 'Tutoring', 'تدريس خاص', 'Private tutoring/coaching', 'تدريس خاص', 'pink'),
    ('other', 'Other', 'أخرى', 'Other activity type', 'نوع نشاط آخر', 'gray')
ON CONFLICT (type_value) DO NOTHING;

-- Create activity_rates table for different rates per activity type
CREATE TABLE IF NOT EXISTS activity_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type session_type NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
    effective_from DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(course_id, coach_id, activity_type, effective_from),
    CONSTRAINT rate_must_have_course CHECK (course_id IS NOT NULL)
);

-- Create index for efficient rate lookups
CREATE INDEX idx_activity_rates_lookup ON activity_rates (course_id, coach_id, activity_type, effective_from DESC);

-- Migration note: Existing sessions with online_session/offline_meeting types are unchanged
-- New sessions can use any of the new activity types
