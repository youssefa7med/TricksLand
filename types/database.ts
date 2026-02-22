// Database types matching the Supabase schema
export type UserRole = 'admin' | 'coach';
export type CourseStatus = 'active' | 'archived';
export type SessionType = 'online_session' | 'offline_meeting';
export type AdjustmentType = 'bonus' | 'discount';
export type SessionStatus = 'scheduled' | 'completed' | 'postponed' | 'cancelled' | 'extra';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type PaymentStatus = 'not_paid' | 'partially_paid' | 'paid';
export type ExpenseCategory = 'instructor' | 'materials' | 'venue' | 'equipment' | 'marketing' | 'other';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'check' | 'other';

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

// ============================================================================
// NEW ENHANCEMENT TYPES
// ============================================================================

export interface StudentAttendance {
    id: string;
    session_id: string;
    student_id: string;
    course_id: string;
    attendance_date: string; // Date string YYYY-MM-DD
    status: AttendanceStatus; // present, absent, late
    arrival_time: string | null; // Time string
    leaving_time: string | null; // Time string
    duration_minutes: number | null;
    marked_by: string;
    marked_at: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface CourseSchedule {
    id: string;
    course_id: string;
    total_sessions: number;
    sessions_per_week: number;
    start_date: string; // Date string
    scheduled_end_date: string; // Date string
    actual_end_date: string | null; // Date string
    sessions_completed: number;
    sessions_cancelled: number;
    sessions_postponed: number;
    extra_sessions_added: number;
    status: 'active' | 'completed' | 'archived';
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CourseExpense {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    amount: number;
    expense_date: string; // Date string
    category: ExpenseCategory;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface StudentPayment {
    id: string;
    student_id: string;
    course_id: string;
    course_fee: number;
    amount_paid: number;
    remaining_balance: number; // Generated column
    payment_status: PaymentStatus;
    first_payment_date: string | null; // Date string
    last_payment_date: string | null; // Date string
    due_date: string | null; // Date string
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface PaymentTransaction {
    id: string;
    payment_record_id: string;
    amount: number;
    transaction_date: string; // Date string
    transaction_time: string; // Time string
    payment_method: PaymentMethod;
    reference_number: string | null;
    notes: string | null;
    created_by: string;
    created_at: string;
}

export interface AdminSetting {
    id: string;
    key: string;
    value: string;
    value_type: 'string' | 'integer' | 'float' | 'boolean' | 'json';
    description: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// VIEW TYPES
// ============================================================================

export interface StudentMonthlyAttendance {
    student_id: string;
    student_name: string;
    course_id: string;
    course_name: string;
    month: string; // YYYY-MM format
    total_sessions: number;
    sessions_attended: number;
    sessions_absent: number;
    sessions_late: number;
    attendance_percentage: number;
}

export interface CourseFinancialSummary {
    course_id: string;
    course_name: string;
    total_course_fees: number;
    total_income: number;
    pending_income: number;
    total_expenses: number;
    net_profit: number;
    total_students: number;
    students_paid: number;
    students_partially_paid: number;
    students_not_paid: number;
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
            // New enhancement tables
            student_attendance: {
                Row: StudentAttendance;
                Insert: Omit<StudentAttendance, 'id' | 'created_at' | 'updated_at' | 'duration_minutes'>;
                Update: Partial<Omit<StudentAttendance, 'id' | 'created_at' | 'updated_at'>>;
                Relationships: [];
            };
            course_schedules: {
                Row: CourseSchedule;
                Insert: Omit<CourseSchedule, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<CourseSchedule, 'id' | 'created_at' | 'updated_at'>>;
                Relationships: [];
            };
            course_expenses: {
                Row: CourseExpense;
                Insert: Omit<CourseExpense, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<CourseExpense, 'id' | 'created_at' | 'updated_at'>>;
                Relationships: [];
            };
            student_payments: {
                Row: StudentPayment;
                Insert: Omit<StudentPayment, 'id' | 'created_at' | 'updated_at' | 'remaining_balance'>;
                Update: Partial<Omit<StudentPayment, 'id' | 'created_at' | 'updated_at' | 'remaining_balance'>>;
                Relationships: [];
            };
            payment_transactions: {
                Row: PaymentTransaction;
                Insert: Omit<PaymentTransaction, 'id' | 'created_at'>;
                Update: Partial<Omit<PaymentTransaction, 'id' | 'created_at'>>;
                Relationships: [];
            };
            admin_settings: {
                Row: AdminSetting;
                Insert: Omit<AdminSetting, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<AdminSetting, 'id' | 'created_at' | 'updated_at'>>;
                Relationships: [];
            };
        };
        Views: {
            coach_monthly_totals: {
                Row: CoachMonthlyTotal;
                Relationships: [];
            };
            student_monthly_attendance: {
                Row: StudentMonthlyAttendance;
                Relationships: [];
            };
            course_financial_summary: {
                Row: CourseFinancialSummary;
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
            calculate_billable_hours: {
                Args: {
                    p_arrival_time: string;
                    p_leaving_time: string;
                };
                Returns: number;
            };
            get_admin_setting: {
                Args: {
                    p_key: string;
                    p_default_value?: string;
                };
                Returns: string;
            };
        };
        Enums: {
            user_role: 'admin' | 'coach';
            course_status: 'active' | 'archived';
            session_type: 'online_session' | 'offline_meeting';
            adjustment_type: 'bonus' | 'discount';
            session_status: 'scheduled' | 'completed' | 'postponed' | 'cancelled' | 'extra';
            payment_status: 'not_paid' | 'partially_paid' | 'paid';
            expense_category: 'instructor' | 'materials' | 'venue' | 'equipment' | 'marketing' | 'other';
        };
        CompositeTypes: Record<string, never>;
    };
}
