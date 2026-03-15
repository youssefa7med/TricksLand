// @ts-nocheck
/**
 * Server Actions for Attendance Management
 * Handles student attendance tracking with geolocation and time tracking
 */

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  StudentAttendance,
  AttendanceStatus,
  StudentMonthlyAttendance,
} from '@/types/database';
import { calculateDurationMinutes, calculateBillableHours } from '@/lib/utils/billing';
import { getGeolocationRadius } from '@/lib/utils/settings';
import { ACADEMY_LOCATION } from '@/lib/academy';

/**
 * Calculate distance between two GPS coordinates (in meters)
 * Using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Mark student attendance for a session
 */
export async function markStudentAttendance(
  sessionId: string,
  studentId: string,
  courseId: string,
  status: AttendanceStatus,
  arrivalTime?: string,
  leavingTime?: string,
  latitude?: number,
  longitude?: number,
  notes?: string
): Promise<{
  success: boolean;
  data?: StudentAttendance;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get session details - explicitly cast result type
    const { data: sessionData, error: sessionError } = (await (supabase as any)
      .from('sessions')
      .select('session_date')
      .eq('id', sessionId)
      .single()) as unknown as { data: { session_date: string } | null; error: any };

    if (sessionError || !sessionData) {
      return { success: false, error: 'Session not found' };
    }

    const attendanceDate = sessionData.session_date;

    // If geolocation is provided, validate radius
    if (latitude !== undefined && longitude !== undefined) {
      const distance = calculateDistance(latitude, longitude, ACADEMY_LOCATION.latitude, ACADEMY_LOCATION.longitude);
      const allowedRadius = await getGeolocationRadius();

      if (distance > allowedRadius) {
        return {
          success: false,
          error: `Too far from academy (${Math.round(distance)}m, allowed: ${allowedRadius}m)`,
        };
      }
    }

    // Calculate duration if both times provided
    let durationMinutes: number | null = null;
    if (arrivalTime && leavingTime) {
      durationMinutes = calculateDurationMinutes(arrivalTime, leavingTime);
    }

    // Insert or update attendance record - explicitly cast result type
    const { data, error } = (await (supabase as any)
      .from('student_attendance')
      .upsert(
        {
          session_id: sessionId,
          student_id: studentId,
          course_id: courseId,
          attendance_date: attendanceDate,
          status,
          arrival_time: arrivalTime || null,
          leaving_time: leavingTime || null,
          duration_minutes: durationMinutes,
          marked_by: (await supabase.auth.getUser()).data.user?.id || '',
          notes: notes || null,
        },
        { onConflict: 'session_id, student_id' }
      )
      .select()
      .single()) as unknown as { success: boolean; data?: StudentAttendance; error: any };

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidate attendance pages
    revalidatePath('/admin/attendance');
    revalidatePath('/coach/attendance');

    return { success: true, data };
  } catch (err) {
    console.error('Error marking attendance:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get student attendance for a session
 */
export async function getSessionAttendance(
  sessionId: string
): Promise<StudentAttendance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_attendance')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }

  return data || [];
}

/**
 * Get course attendance for a specific month
 */
export async function getCourseMonthlyAttendance(
  courseId: string,
  month: string // YYYY-MM format
): Promise<StudentMonthlyAttendance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_monthly_attendance')
    .select('*')
    .eq('course_id', courseId)
    .eq('month', month);

  if (error) {
    console.error('Error fetching course attendance:', error);
    return [];
  }

  return data || [];
}

/**
 * Get student attendance history for a course
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  courseId?: string
): Promise<StudentAttendance[]> {
  const supabase = await createClient();

  let query = supabase
    .from('student_attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false });

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching student attendance:', error);
    return [];
  }

  return data || [];
}

/**
 * Get attendance statistics for a course in a month
 */
export async function getCourseAttendanceStats(
  courseId: string,
  month: string // YYYY-MM format
): Promise<{
  total_sessions: number;
  total_present: number;
  total_absent: number;
  total_late: number;
  attendance_rate: number;
}> {
  const supabase = await createClient();

  const { data, error } = (await (supabase as any)
    .from('student_monthly_attendance')
    .select('*')
    .eq('course_id', courseId)
    .eq('month', month)) as { data: StudentMonthlyAttendance[] | null; error: any };

  if (error || !data || data.length === 0) {
    return {
      total_sessions: 0,
      total_present: 0,
      total_absent: 0,
      total_late: 0,
      attendance_rate: 0,
    };
  }

  // Aggregate stats from monthly view
  const stats = {
    total_sessions: 0,
    total_present: 0,
    total_absent: 0,
    total_late: 0,
  };

  for (const record of data) {
    stats.total_sessions += record.total_sessions;
    stats.total_present += record.sessions_attended;
    stats.total_absent += record.sessions_absent;
    stats.total_late += record.sessions_late;
  }

  return {
    ...stats,
    attendance_rate:
      stats.total_sessions > 0
        ? Math.round((stats.total_present / stats.total_sessions) * 100)
        : 0,
  };
}

/**
 * Delete attendance record
 */
export async function deleteAttendanceRecord(attendanceId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('student_attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) {
      console.error('Error deleting attendance:', error);
      return false;
    }

    revalidatePath('/admin/attendance');
    revalidatePath('/coach/attendance');

    return true;
  } catch (err) {
    console.error('Error deleting attendance:', err);
    return false;
  }
}

/**
 * Bulk mark attendance for multiple students
 */
export async function bulkMarkAttendance(
  sessionId: string,
  courseId: string,
  attendanceRecords: Array<{
    studentId: string;
    status: AttendanceStatus;
    arrivalTime?: string;
    leavingTime?: string;
    notes?: string;
  }>
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = await createClient();

    // Get session date
    const { data: sessionData, error: sessionError } = (await (supabase as any)
      .from('sessions')
      .select('session_date')
      .eq('id', sessionId)
      .single()) as { data: { session_date: string } | null; error: any };

    if (sessionError || !sessionData) {
      return { success: false, count: 0, error: 'Session not found' };
    }

    const attendanceDate = sessionData.session_date;
    const userId = (await supabase.auth.getUser()).data.user?.id || '';

    // Prepare bulk insert data
    const bulkData = attendanceRecords.map((record) => {
      let durationMinutes: number | null = null;
      if (record.arrivalTime && record.leavingTime) {
        durationMinutes = calculateDurationMinutes(record.arrivalTime, record.leavingTime);
      }

      return {
        session_id: sessionId,
        student_id: record.studentId,
        course_id: courseId,
        attendance_date: attendanceDate,
        status: record.status,
        arrival_time: record.arrivalTime || null,
        leaving_time: record.leavingTime || null,
        duration_minutes: durationMinutes,
        marked_by: userId,
        notes: record.notes || null,
      };
    });

    // Insert all records
    const { error } = (await (supabase as any)
      .from('student_attendance')
      .upsert(bulkData, { onConflict: 'session_id, student_id' })) as { error: any };

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    revalidatePath('/admin/attendance');
    revalidatePath('/coach/attendance');

    return { success: true, count: attendanceRecords.length };
  } catch (err) {
    console.error('Error bulk marking attendance:', err);
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Calculate billable hours from attendance record
 * Used for coach time calculation
 */
export async function calculateSessionBillableHours(
  sessionId: string,
  studentId: string
): Promise<number | null> {
  const supabase = await createClient();

  const { data, error } = (await (supabase as any)
    .from('student_attendance')
    .select('arrival_time, leaving_time')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .single()) as { data: { arrival_time: string; leaving_time: string } | null; error: any };

  if (error || !data || !data.arrival_time || !data.leaving_time) {
    return null;
  }

  const durationMinutes = calculateDurationMinutes(data.arrival_time, data.leaving_time);
  return calculateBillableHours(durationMinutes);
}
