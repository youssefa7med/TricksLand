// Database types matching the Supabase schema
export type UserRole = 'admin' | 'coach';
export type CourseStatus = 'active' | 'archived';
export type SessionType = 'online_session' | 'offline_meeting';
export type AdjustmentType = 'bonus' | 'discount';

export interface Profile {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface Course {
    id: string;
    name: string;
    description: string | null;
    status: CourseStatus;
    hourly_rate: number | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CourseCoach {
    course_id: string;
    coach_id: string;
    assigned_at: string;
}

export interface CourseStudent {
    id: string;
    course_id: string;
    student_id: string;
    enrolled_by?: string;
    created_at: string;
}

export interface Student {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
    parent_phone: string | null;
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CourseCoachRate {
    id: string;
    course_id: string;
    coach_id: string;
    rate: number;
    effective_from: string; // Date string YYYY-MM-DD
    created_by: string;
    created_at: string;
}

export interface Session {
    id: string;
    course_id: string;
    session_date: string; // Date string
    start_time: string; // Time string
    end_time: string; // Time string
    session_type: SessionType;
    originally_scheduled_coach_id: string | null;
    paid_coach_id: string;
    computed_hours: number | null;
    applied_rate: number | null;
    subtotal: number | null;
    notes: string | null;
    created_by: string;
    created_at: string;
}

export interface CoachAttendance {
    id: string;
    coach_id: string;
    session_id: string;
    latitude: number;
    longitude: number;
    distance_from_academy: number;
    attendance_timestamp: string;
    status: string;
    created_at: string;
}

export interface Adjustment {
    id: string;
    coach_id: string;
    month: string; // YYYY-MM format
    type: AdjustmentType;
    amount: number;
    notes: string | null;
    created_by: string;
    created_at: string;
}

// Extended types with relations
export interface SessionWithDetails extends Session {
    course?: { name: string } | null;
    paid_coach?: { full_name: string; email: string } | null;
    originally_scheduled_coach?: { full_name: string } | null;
}

export interface CourseWithCoaches extends Course {
    coaches?: Profile[];
    students?: CourseStudent[];
}

export interface CoachMonthlyTotal {
    coach_id: string;
    coach_name: string;
    month: string;
    session_count: number;
    total_hours: number;
    gross_total: number;
    total_bonuses: number;
    total_discounts: number;
    net_total: number;
}

// Form types
export interface SessionFormData {
    course_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    use_replacement_coach: boolean;
    originally_scheduled_coach_id: string | null;
    paid_coach_id: string;
    notes: string | null;
}

export interface CourseFormData {
    name: string;
    description: string | null;
    status: CourseStatus;
}

export interface CourseCoachRateFormData {
    course_id: string;
    coach_id: string;
    rate: number;
    effective_from: string;
}

export interface AdjustmentFormData {
    coach_id: string;
    month: string;
    type: AdjustmentType;
    amount: number;
    notes: string;
}

// Database schema for Supabase client (supabase-js v2 format)
export interface Database {
    __InternalSupabase: { PostgrestVersion: "12" };
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
                Relationships: [];
            };
            courses: {
                Row: Course;
                Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Course, 'id' | 'created_at'>>;
                Relationships: [];
            };
            course_coaches: {
                Row: CourseCoach;
                Insert: Omit<CourseCoach, 'assigned_at'>;
                Update: Partial<CourseCoach>;
                Relationships: [];
            };
            course_students: {
                Row: CourseStudent;
                Insert: Omit<CourseStudent, 'id' | 'added_at'>;
                Update: Partial<Omit<CourseStudent, 'id' | 'added_at'>>;
                Relationships: [];
            };
            course_coach_rates: {
                Row: CourseCoachRate;
                Insert: Omit<CourseCoachRate, 'id' | 'created_at'>;
                Update: Partial<Omit<CourseCoachRate, 'id' | 'created_at'>>;
                Relationships: [];
            };
            sessions: {
                Row: Session;
                Insert: Omit<Session, 'id' | 'computed_hours' | 'applied_rate' | 'subtotal' | 'created_at'>;
                Update: Partial<Omit<Session, 'id' | 'computed_hours' | 'applied_rate' | 'subtotal' | 'created_at'>>;
                Relationships: [];
            };
            adjustments: {
                Row: Adjustment;
                Insert: Omit<Adjustment, 'id' | 'created_at'>;
                Update: Partial<Omit<Adjustment, 'id' | 'created_at'>>;
                Relationships: [];
            };
            coach_attendance: {
                Row: CoachAttendance;
                Insert: Omit<CoachAttendance, 'id' | 'created_at'>;
                Update: Partial<Omit<CoachAttendance, 'id' | 'created_at'>>;
                Relationships: [];
            };
        };
        Views: {
            coach_monthly_totals: {
                Row: CoachMonthlyTotal;
                Relationships: [];
            };
        };
        Functions: {
            is_admin: {
                Args: Record<string, never>;
                Returns: boolean;
            };
            get_hourly_rate: {
                Args: {
                    p_course_id: string;
                    p_coach_id: string;
                    p_session_date: string;
                };
                Returns: number;
            };
        };
        Enums: {
            user_role: 'admin' | 'coach';
            course_status: 'active' | 'archived';
            session_type: 'online_session' | 'offline_meeting';
            adjustment_type: 'bonus' | 'discount';
        };
        CompositeTypes: Record<string, never>;
    };
}
