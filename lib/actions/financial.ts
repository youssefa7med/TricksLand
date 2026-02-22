/**
 * Server Actions for Financial Management
 * Handles student payments, expenses, and course financial tracking
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  StudentPayment,
  PaymentTransaction,
  CourseExpense,
  CourseFinancialSummary,
  PaymentStatus,
} from '@/types/database';

// ============================================================================
// STUDENT PAYMENTS
// ============================================================================

/**
 * Create or update student payment record
 */
export async function upsertStudentPayment(
  studentId: string,
  courseId: string,
  courseFee: number,
  dueDate?: string,
  notes?: string
): Promise<{ success: boolean; data?: StudentPayment; error?: string }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('student_payments')
      .upsert(
        {
          student_id: studentId,
          course_id: courseId,
          course_fee: courseFee,
          payment_status: 'not_paid' as const,
          due_date: dueDate || null,
          notes: notes || null,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        },
        { onConflict: 'student_id, course_id' }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/courses');
    revalidatePath('/admin/invoices');

    return { success: true, data };
  } catch (err) {
    console.error('Error upserting payment:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Record a payment transaction
 */
export async function recordPaymentTransaction(
  paymentRecordId: string,
  amount: number,
  paymentMethod: string = 'cash',
  referenceNumber?: string,
  notes?: string
): Promise<{ success: boolean; data?: PaymentTransaction; error?: string }> {
  try {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    const supabase = createClient();

    // Insert transaction
    const { data: transactionData, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        payment_record_id: paymentRecordId,
        amount,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_time: new Date().toTimeString().split(' ')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
      })
      .select()
      .single();

    if (transactionError) {
      return { success: false, error: transactionError.message };
    }

    // Update payment record with new amount_paid
    const { data: paymentData, error: paymentError } = await supabase
      .from('student_payments')
      .select('amount_paid')
      .eq('id', paymentRecordId)
      .single();

    if (!paymentError && paymentData) {
      const newAmountPaid = (paymentData.amount_paid || 0) + amount;

      await supabase
        .from('student_payments')
        .update({
          amount_paid: newAmountPaid,
          first_payment_date:
            newAmountPaid > 0 ? new Date().toISOString().split('T')[0] : null,
          last_payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', paymentRecordId);
    }

    revalidatePath('/admin/invoices');
    revalidatePath('/coach/invoices');

    return { success: true, data: transactionData };
  } catch (err) {
    console.error('Error recording payment:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get student payment record
 */
export async function getStudentPayment(
  studentId: string,
  courseId: string
): Promise<StudentPayment | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('student_payments')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get all payment records for a course
 */
export async function getCoursePayments(courseId: string): Promise<StudentPayment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('student_payments')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching course payments:', error);
    return [];
  }

  return data || [];
}

/**
 * Get payment transactions for a student payment record
 */
export async function getPaymentHistory(paymentRecordId: string): Promise<PaymentTransaction[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_record_id', paymentRecordId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get payment summary for a course
 */
export async function getCoursePaymentSummary(
  courseId: string
): Promise<{
  total_students: number;
  total_course_fees: number;
  total_collected: number;
  total_pending: number;
  paid_count: number;
  partially_paid_count: number;
  not_paid_count: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('student_payments')
    .select('*')
    .eq('course_id', courseId);

  if (error || !data || data.length === 0) {
    return {
      total_students: 0,
      total_course_fees: 0,
      total_collected: 0,
      total_pending: 0,
      paid_count: 0,
      partially_paid_count: 0,
      not_paid_count: 0,
    };
  }

  const summary = {
    total_students: data.length,
    total_course_fees: 0,
    total_collected: 0,
    total_pending: 0,
    paid_count: 0,
    partially_paid_count: 0,
    not_paid_count: 0,
  };

  for (const payment of data) {
    summary.total_course_fees += payment.course_fee;
    summary.total_collected += payment.amount_paid || 0;
    summary.total_pending += payment.remaining_balance;

    if (payment.payment_status === 'paid') summary.paid_count++;
    else if (payment.payment_status === 'partially_paid') summary.partially_paid_count++;
    else summary.not_paid_count++;
  }

  return summary;
}

// ============================================================================
// COURSE EXPENSES
// ============================================================================

/**
 * Add course expense
 */
export async function addCourseExpense(
  courseId: string,
  title: string,
  amount: number,
  expenseDate: string,
  category: string = 'other',
  description?: string
): Promise<{ success: boolean; data?: CourseExpense; error?: string }> {
  try {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('course_expenses')
      .insert({
        course_id: courseId,
        title,
        description: description || null,
        amount,
        expense_date: expenseDate,
        category,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/courses');
    revalidatePath('/admin/invoices');

    return { success: true, data };
  } catch (err) {
    console.error('Error adding expense:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get course expenses
 */
export async function getCourseExpenses(
  courseId: string,
  startDate?: string,
  endDate?: string
): Promise<CourseExpense[]> {
  const supabase = createClient();

  let query = supabase
    .from('course_expenses')
    .select('*')
    .eq('course_id', courseId);

  if (startDate) {
    query = query.gte('expense_date', startDate);
  }

  if (endDate) {
    query = query.lte('expense_date', endDate);
  }

  const { data, error } = await query.order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete course expense
 */
export async function deleteCourseExpense(expenseId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('course_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('Error deleting expense:', error);
      return false;
    }

    revalidatePath('/admin/courses');

    return true;
  } catch (err) {
    console.error('Error deleting expense:', err);
    return false;
  }
}

// ============================================================================
// FINANCIAL SUMMARY
// ============================================================================

/**
 * Get course financial summary
 */
export async function getCourseFinancialSummary(
  courseId: string
): Promise<CourseFinancialSummary | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('course_financial_summary')
    .select('*')
    .eq('course_id', courseId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get financial summary for multiple courses
 */
export async function getAllCoursesFinancialSummary(): Promise<CourseFinancialSummary[]> {
  const supabase = createClient();

  const { data, error } = await supabase.from('course_financial_summary').select('*');

  if (error) {
    console.error('Error fetching financial summaries:', error);
    return [];
  }

  return data || [];
}

/**
 * Calculate platform-wide revenue
 */
export async function getPlatformRevenueSummary(): Promise<{
  total_income: number;
  total_expenses: number;
  net_profit: number;
  total_courses: number;
  total_students: number;
}> {
  const summaries = await getAllCoursesFinancialSummary();

  let totalIncome = 0;
  let totalExpenses = 0;
  const courseIds = new Set<string>();
  const studentIds = new Set<string>();

  for (const summary of summaries) {
    totalIncome += summary.total_income;
    totalExpenses += summary.total_expenses;
    courseIds.add(summary.course_id);
    // Note: would need additional query to get unique student count across all courses
  }

  return {
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_profit: totalIncome - totalExpenses,
    total_courses: courseIds.size,
    total_students: 0, // Would need additional calculation
  };
}
