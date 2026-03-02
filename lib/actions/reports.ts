// @ts-nocheck
/**
 * Server Actions for Report Generation
 * Generates data for various reports used in Excel export and dashboards
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import {
  StudentMonthlyAttendance,
  CourseFinancialSummary,
  Session,
  StudentPayment,
  CourseExpense,
} from '@/types/database';

// ============================================================================
// ATTENDANCE REPORTS
// ============================================================================

/**
 * Generate student monthly attendance report
 */
export async function generateStudentAttendanceReport(
  month: string // YYYY-MM format
): Promise<StudentMonthlyAttendance[]> {
  const supabase = await createClient();

  const { data, error } = (await (supabase as any)
    .from('student_monthly_attendance')
    .select('*')
    .eq('month', month)
    .order('student_name', { ascending: true })) as { data: StudentMonthlyAttendance[] | null; error: any };

  if (error) {
    console.error('Error generating attendance report:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate course attendance report
 */
export async function generateCourseAttendanceReport(
  courseId: string,
  month: string // YYYY-MM format
): Promise<StudentMonthlyAttendance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_monthly_attendance')
    .select('*')
    .eq('course_id', courseId)
    .eq('month', month)
    .order('student_name', { ascending: true });

  if (error) {
    console.error('Error generating course attendance report:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================

/**
 * Generate course financial report
 */
export async function generateCourseFinancialReport(): Promise<CourseFinancialSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('course_financial_summary')
    .select('*')
    .order('course_name', { ascending: true });

  if (error) {
    console.error('Error generating financial report:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate course payment details report
 */
export async function generateCoursePaymentReport(
  courseId: string
): Promise<
  Array<{
    student_id: string;
    student_name: string;
    course_fee: number;
    amount_paid: number;
    remaining_balance: number;
    payment_status: string;
    due_date: string | null;
  }>
> {
  const supabase = await createClient();

  const { data: paymentData, error: paymentError } = await supabase
    .from('student_payments')
    .select(
      `
      id,
      student_id,
      course_fee,
      amount_paid,
      remaining_balance,
      payment_status,
      due_date
    `
    )
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (paymentError || !paymentData) {
    console.error('Error fetching payment data:', paymentError);
    return [];
  }

  // Get student names
  const studentIds = paymentData.map((p) => p.student_id);
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds);

  const profileMap = new Map(profileData?.map((p) => [p.id, p.full_name]) || []);

  return paymentData.map((payment) => ({
    student_id: payment.student_id,
    student_name: profileMap.get(payment.student_id) || 'Unknown',
    course_fee: payment.course_fee,
    amount_paid: payment.amount_paid || 0,
    remaining_balance: payment.remaining_balance,
    payment_status: payment.payment_status,
    due_date: payment.due_date,
  }));
}

/**
 * Generate course expense report
 */
export async function generateCourseExpenseReport(
  courseId: string,
  startDate?: string,
  endDate?: string
): Promise<
  Array<{
    date: string;
    category: string;
    title: string;
    amount: number;
    description: string | null;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from('course_expenses')
    .select('expense_date, category, title, amount, description')
    .eq('course_id', courseId);

  if (startDate) {
    query = query.gte('expense_date', startDate);
  }

  if (endDate) {
    query = query.lte('expense_date', endDate);
  }

  const { data, error } = await query.order('expense_date', { ascending: false });

  if (error) {
    console.error('Error generating expense report:', error);
    return [];
  }

  return (data || []).map((expense) => ({
    date: expense.expense_date,
    category: expense.category,
    title: expense.title,
    amount: expense.amount,
    description: expense.description,
  }));
}

// ============================================================================
// COACH REPORTS
// ============================================================================

/**
 * Generate coach worked hours report.
 * Each row includes both scheduled hours (session time) and billed hours
 * (15-minute module rule from actual arrival/leaving, when recorded).
 */
export async function generateCoachHoursReport(
  coachId: string,
  month: string // YYYY-MM format
): Promise<
  Array<{
    session_date: string;
    course_name: string;
    duration_minutes: number;
    computed_hours: number;
    /** Billed hours via 15-min module rule. null when arrival/leaving not recorded. */
    billed_hours: number | null;
    applied_rate: number;
    subtotal: number;
    /** Amount payable using billed_hours × rate (null when billed_hours unavailable). */
    billed_subtotal: number | null;
  }>
> {
  const supabase = await createClient();

  const [startDate, monthNum] = month.split('-');
  const startOfMonth = `${month}-01`;
  const endOfMonth = new Date(parseInt(startDate), parseInt(monthNum), 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      session_date,
      courses(name),
      computed_hours,
      applied_rate,
      subtotal,
      coach_attendance!left(billed_hours, duration_minutes)
    `)
    .eq('paid_coach_id', coachId)
    .eq('coach_attendance.coach_id', coachId)
    .gte('session_date', startOfMonth)
    .lte('session_date', endOfMonth)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('Error generating coach hours report:', error);
    return [];
  }

  return (data || []).map((session: any) => {
    const attendance = Array.isArray(session.coach_attendance)
      ? session.coach_attendance[0]
      : session.coach_attendance;
    const billedHours: number | null = attendance?.billed_hours ?? null;
    const appliedRate: number = session.applied_rate ?? 0;

    return {
      session_date:    session.session_date,
      course_name:     session.courses?.name || 'Unknown',
      duration_minutes: attendance?.duration_minutes ?? 0,
      computed_hours:  session.computed_hours || 0,
      billed_hours:    billedHours,
      applied_rate:    appliedRate,
      subtotal:        session.subtotal || 0,
      billed_subtotal: billedHours !== null
        ? Math.round(billedHours * appliedRate * 100) / 100
        : null,
    };
  });
}

/**
 * Generate coach payroll report.
 *
 * Each record now includes both the original session-time-based figures
 * AND the new 15-minute-module billed-hours figures:
 *
 *  total_hours       – scheduled hours (session start→end)
 *  total_billed_hours – actual hours via FLOOR(minutes/15)×0.25
 *                       (null when coach arrival/leaving not yet recorded)
 *  net_payable        – original net (session-time-based)
 *  net_billed_payable – preferred net using billed_hours × rate
 */
export async function generateCoachPayrollReport(
  month: string // YYYY-MM format
): Promise<
  Array<{
    coach_id: string;
    coach_name: string;
    total_sessions: number;
    /** Scheduled hours based on session start→end times. */
    total_hours: number;
    /**
     * Coach billed hours calculated via 15-minute module rule.
     * null when arrival/leaving times have not been recorded yet.
     */
    total_billed_hours: number | null;
    /** Gross earnings using session-time-based hours (original). */
    total_earned: number;
    /** Gross earnings using billed_hours × rate (preferred). */
    total_billed_earned: number;
    total_bonuses: number;
    total_discounts: number;
    /** Net payable using session-time-based hours (original). */
    net_payable: number;
    /** Net payable using 15-minute module billed hours (preferred for payroll). */
    net_billed_payable: number;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('coach_monthly_totals')
    .select('*')
    .eq('month', month);

  if (error || !data) {
    console.error('Error generating payroll report:', error);
    return [];
  }

  return (data || []).map((record: any) => ({
    coach_id:            record.coach_id,
    coach_name:          record.coach_name,
    total_sessions:      record.session_count,
    total_hours:         record.total_hours,
    total_billed_hours:  record.total_billed_hours ?? null,
    total_earned:        record.gross_total,
    total_billed_earned: record.billed_gross_total,
    total_bonuses:       record.total_bonuses,
    total_discounts:     record.total_discounts,
    net_payable:         record.net_total,
    net_billed_payable:  record.net_billed_total,
  }));
}

// ============================================================================
// SUMMARY REPORTS
// ============================================================================

/**
 * Generate platform revenue summary
 */
export async function generateRevenueSummaryReport(
  month?: string // YYYY-MM format (optional)
): Promise<{
  period: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  num_courses: number;
  num_students: number;
  num_payments_received: number;
  num_payments_pending: number;
}> {
  const supabase = await createClient();

  // Get financial summaries
  const { data: financialData } = await supabase
    .from('course_financial_summary')
    .select('*');

  let totalIncome = 0;
  let totalExpenses = 0;
  const courseIds = new Set<string>();

  if (financialData) {
    for (const summary of financialData) {
      totalIncome += summary.total_income || 0;
      totalExpenses += summary.total_expenses || 0;
      courseIds.add(summary.course_id);
    }
  }

  // Count payments
  let paymentsQuery = supabase.from('student_payments').select('count', { count: 'exact' });

  const { count: paidCount } = await paymentsQuery.eq('payment_status', 'paid');

  const { count: pendingCount } = await supabase
    .from('student_payments')
    .select('count', { count: 'exact' })
    .neq('payment_status', 'paid');

  // Count students
  const { data: studentPayments } = await supabase
    .from('student_payments')
    .select('student_id');

  const uniqueStudents = new Set(studentPayments?.map((p) => p.student_id) || []);

  return {
    period: month || 'All Time',
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_profit: totalIncome - totalExpenses,
    num_courses: courseIds.size,
    num_students: uniqueStudents.size,
    num_payments_received: paidCount || 0,
    num_payments_pending: pendingCount || 0,
  };
}

/**
 * Generate attendance summary report for all courses
 */
export async function generateAttendanceSummaryReport(month: string): Promise<{
  month: string;
  total_courses: number;
  total_students: number;
  total_sessions_scheduled: number;
  total_sessions_attended: number;
  platform_attendance_rate: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_monthly_attendance')
    .select('*')
    .eq('month', month);

  if (error || !data || data.length === 0) {
    return {
      month,
      total_courses: 0,
      total_students: 0,
      total_sessions_scheduled: 0,
      total_sessions_attended: 0,
      platform_attendance_rate: 0,
    };
  }

  const courseSet = new Set<string>();
  const studentSet = new Set<string>();
  let totalSessions = 0;
  let totalAttended = 0;

  for (const record of data) {
    courseSet.add(record.course_id);
    studentSet.add(record.student_id);
    totalSessions += record.total_sessions;
    totalAttended += record.sessions_attended;
  }

  return {
    month,
    total_courses: courseSet.size,
    total_students: studentSet.size,
    total_sessions_scheduled: totalSessions,
    total_sessions_attended: totalAttended,
    platform_attendance_rate:
      totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0,
  };
}
