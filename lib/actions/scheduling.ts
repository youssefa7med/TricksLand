// @ts-nocheck
/**
 * Server Actions for Course Scheduling
 * Handles dynamic course scheduling with sessions management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { CourseSchedule, SessionStatus } from '@/types/database';

// ============================================================================
// COURSE SCHEDULES
// ============================================================================

/**
 * Create course schedule
 */
export async function createCourseSchedule(
  courseId: string,
  totalSessions: number,
  sessionsPerWeek: number,
  startDate: string,
  scheduledEndDate: string
): Promise<{ success: boolean; data?: CourseSchedule; error?: string }> {
  try {
    if (totalSessions <= 0 || sessionsPerWeek <= 0) {
      return { success: false, error: 'Sessions and sessions per week must be greater than 0' };
    }

    const supabase = await createClient();

    // Check if schedule already exists for this course
    const { data: existing } = await supabase
      .from('course_schedules')
      .select('id')
      .eq('course_id', courseId)
      .single();

    if (existing) {
      return { success: false, error: 'Schedule already exists for this course' };
    }

    const { data, error } = await supabase
      .from('course_schedules')
      .insert({
        course_id: courseId,
        total_sessions: totalSessions,
        sessions_per_week: sessionsPerWeek,
        start_date: startDate,
        scheduled_end_date: scheduledEndDate,
        status: 'active',
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/courses');

    return { success: true, data };
  } catch (err) {
    console.error('Error creating schedule:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get course schedule
 */
export async function getCourseSchedule(courseId: string): Promise<CourseSchedule | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('course_schedules')
    .select('*')
    .eq('course_id', courseId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update course schedule - increment sessions_completed when session is logged
 */
export async function incrementSessionCompleted(courseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Find the active schedule for this course
    const { data: schedule, error: fetchError } = await supabase
      .from('course_schedules')
      .select('id, sessions_completed')
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching schedule:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!schedule) {
      // No active schedule found, but don't fail - just skip
      return { success: true };
    }

    // Increment sessions_completed
    const { error: updateError } = await supabase
      .from('course_schedules')
      .update({
        sessions_completed: (schedule.sessions_completed || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    if (updateError) {
      console.error('Error incrementing sessions_completed:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/scheduling');

    return { success: true };
  } catch (err) {
    console.error('Error in incrementSessionCompleted:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Decrement sessions_completed when session is deleted/cancelled
 */
export async function decrementSessionCompleted(courseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Find the active schedule for this course
    const { data: schedule, error: fetchError } = await supabase
      .from('course_schedules')
      .select('id, sessions_completed')
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching schedule:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!schedule) {
      // No active schedule found, but don't fail - just skip
      return { success: true };
    }

    // Decrement sessions_completed (don't go below 0)
    const newCount = Math.max(0, (schedule.sessions_completed || 1) - 1);
    const { error: updateError } = await supabase
      .from('course_schedules')
      .update({
        sessions_completed: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    if (updateError) {
      console.error('Error decrementing sessions_completed:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/scheduling');

    return { success: true };
  } catch (err) {
    console.error('Error in decrementSessionCompleted:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Update course schedule
 */
export async function updateCourseSchedule(
  scheduleId: string,
  updates: Partial<CourseSchedule>
): Promise<{ success: boolean; data?: CourseSchedule; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('course_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/courses');

    return { success: true, data };
  } catch (err) {
    console.error('Error updating schedule:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// SESSION STATUS TRACKING
// ============================================================================

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('sessions')
      .update({ session_status: status })
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/sessions');
    revalidatePath('/coach/sessions');

    return { success: true };
  } catch (err) {
    console.error('Error updating session status:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Mark session as completed
 */
export async function completeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  return updateSessionStatus(sessionId, 'completed');
}

/**
 * Postpone session
 */
export async function postponeSession(
  sessionId: string,
  rescheduledFromDate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const updates: any = { session_status: 'postponed' as const };

    // If rescheduling from another session, create link
    if (rescheduledFromDate) {
      // Find the previous session on that date
      const { data: previousSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_date', rescheduledFromDate)
        .in('session_status', ['scheduled', 'completed'])
        .limit(1)
        .single();

      if (previousSession) {
        updates.rescheduled_from = previousSession.id;
      }
    }

    const { error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/sessions');

    return { success: true };
  } catch (err) {
    console.error('Error postponing session:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Cancel session
 */
export async function cancelSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  return updateSessionStatus(sessionId, 'cancelled');
}

/**
 * Mark session as extra
 */
export async function markSessionAsExtra(sessionId: string): Promise<{ success: boolean; error?: string }> {
  return updateSessionStatus(sessionId, 'extra');
}

// ============================================================================
// SCHEDULE STATISTICS
// ============================================================================

/**
 * Get schedule statistics
 */
export async function getScheduleStats(scheduleId: string): Promise<{
  total_sessions: number;
  scheduled: number;
  completed: number;
  postponed: number;
  cancelled: number;
  extra: number;
  pending: number;
  completion_rate: number;
}> {
  const supabase = await createClient();

  // Get schedule to get course_id
  const { data: scheduleData } = await supabase
    .from('course_schedules')
    .select('course_id, total_sessions')
    .eq('id', scheduleId)
    .single();

  if (!scheduleData) {
    return {
      total_sessions: 0,
      scheduled: 0,
      completed: 0,
      postponed: 0,
      cancelled: 0,
      extra: 0,
      pending: 0,
      completion_rate: 0,
    };
  }

  // Get all sessions for this course
  const { data: sessions } = await supabase
    .from('sessions')
    .select('session_status')
    .eq('course_id', scheduleData.course_id);

  if (!sessions) {
    return {
      total_sessions: scheduleData.total_sessions,
      scheduled: 0,
      completed: 0,
      postponed: 0,
      cancelled: 0,
      extra: 0,
      pending: 0,
      completion_rate: 0,
    };
  }

  const stats = {
    total_sessions: scheduleData.total_sessions,
    scheduled: 0,
    completed: 0,
    postponed: 0,
    cancelled: 0,
    extra: 0,
  };

  for (const session of sessions) {
    switch (session.session_status) {
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'postponed':
        stats.postponed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'extra':
        stats.extra++;
        break;
    }
  }

  const pending = stats.scheduled + stats.postponed;
  const completionRate = 
    scheduleData.total_sessions > 0
      ? Math.round((stats.completed / scheduleData.total_sessions) * 100)
      : 0;

  return {
    ...stats,
    pending,
    completion_rate: completionRate,
  };
}

// These utility functions don't need to be server actions - they're just calculations
// Removed from this file and can be imported from lib/utils or called from client as regular functions
