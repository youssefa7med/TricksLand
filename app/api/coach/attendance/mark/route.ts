import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Profile, Session, CoachAttendance } from '@/types/database';

// Academy location constants (backend source of truth)
const ACADEMY_LOCATION = {
    latitude: 29.073694,
    longitude: 31.112250,
    radius: 50, // meters
};

/**
 * Haversine distance calculation (backend validation)
 */
function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const EARTH_RADIUS_METERS = 6371000;

    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.asin(Math.sqrt(a));
    return Math.round(EARTH_RADIUS_METERS * c * 100) / 100;
}

/**
 * POST /api/coach/attendance/mark
 * Handle attendance submission with backend location validation
 */
export async function POST(request: NextRequest) {
    try {
        // Ensure HTTPS
        if (request.headers.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
            return NextResponse.json(
                { error: 'This feature requires HTTPS' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { sessionId, latitude, longitude } = body;

        if (!sessionId || latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Type validation
        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return NextResponse.json(
                { error: 'Invalid coordinates' },
                { status: 400 }
            );
        }

        // ============ Authentication Check ============
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized - User not authenticated' },
                { status: 401 }
            );
        }

        // Check user is a coach
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const profile = profileData as Pick<Profile, 'role'> | null;

        if (profileError || profile?.role !== 'coach') {
            return NextResponse.json(
                { error: 'Forbidden - Only coaches can mark attendance' },
                { status: 403 }
            );
        }

        // ============ Location Validation (Backend) ============
        const distance = haversineDistance(
            ACADEMY_LOCATION.latitude,
            ACADEMY_LOCATION.longitude,
            latitude,
            longitude
        );

        if (distance > ACADEMY_LOCATION.radius) {
            return NextResponse.json(
                {
                    error: 'You are too far from the academy',
                    distance,
                    maxDistance: ACADEMY_LOCATION.radius,
                },
                { status: 403 }
            );
        }

        // ============ Check Session Exists ============
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('id, session_date, paid_coach_id')
            .eq('id', sessionId)
            .single();

        const session = sessionData as Pick<Session, 'id' | 'session_date' | 'paid_coach_id'> | null;

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Verify coach is assigned to this session
        if (session.paid_coach_id !== user.id) {
            return NextResponse.json(
                { error: 'You are not assigned to this session' },
                { status: 403 }
            );
        }

        // ============ Check for Duplicate Attendance ============
        const today = new Date().toISOString().split('T')[0];
        const { data: existingAttendance } = await supabase
            .from('coach_attendance')
            .select('id')
            .eq('coach_id', user.id)
            .eq('session_id', sessionId)
            .gte('attendance_timestamp', `${today}T00:00:00`)
            .lte('attendance_timestamp', `${today}T23:59:59`)
            .single();

        if (existingAttendance) {
            return NextResponse.json(
                { error: 'You have already marked attendance for this session today' },
                { status: 409 }
            );
        }

        // ============ Insert Attendance Record ============
        // Record the current time as the coach's arrival_time.
        // billed_hours will be computed by a DB trigger once leaving_time is filled in
        // via the PATCH /api/coach/attendance/mark endpoint.
        const now = new Date();
        const arrivalTime = now.toTimeString().split(' ')[0]; // "HH:MM:SS"

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attendanceData, error: insertError } = await (supabase as any)
            .from('coach_attendance')
            .insert({
                coach_id: user.id,
                session_id: sessionId,
                latitude,
                longitude,
                distance_from_academy: distance,
                attendance_timestamp: now.toISOString(),
                status: 'present',
                arrival_time: arrivalTime,
                // leaving_time and billed_hours remain NULL until coach checks out
            })
            .select()
            .single();

        const attendance = attendanceData as Pick<CoachAttendance, 'id' | 'attendance_timestamp'> | null;

        if (insertError) {
            console.error('Attendance insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to record attendance' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Attendance marked successfully',
                attendance: {
                    id: attendance?.id,
                    distance,
                    timestamp: attendance?.attendance_timestamp,
                    arrival_time: arrivalTime,
                    checkout_url: `/api/coach/attendance/mark`,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Attendance API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/coach/attendance/mark
 * Coach check-out: record leaving_time for a session.
 * The DB trigger will automatically compute duration_minutes and billed_hours
 * using the 15-minute module rule: FLOOR(duration_minutes / 15) × 0.25.
 *
 * Body: { attendanceId: string }
 *         OR
 *       { sessionId: string }
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { attendanceId, sessionId } = body as {
            attendanceId?: string;
            sessionId?: string;
        };

        if (!attendanceId && !sessionId) {
            return NextResponse.json(
                { error: 'Either attendanceId or sessionId is required' },
                { status: 400 }
            );
        }

        // Resolve the attendance record to update
        let resolvedAttendanceId = attendanceId;

        if (!resolvedAttendanceId && sessionId) {
            const { data: existing, error: findError } = await (supabase as any)
                .from('coach_attendance')
                .select('id')
                .eq('coach_id', user.id)
                .eq('session_id', sessionId)
                .order('attendance_timestamp', { ascending: false })
                .limit(1)
                .single();

            if (findError || !existing) {
                return NextResponse.json(
                    { error: 'Attendance record not found – check in first' },
                    { status: 404 }
                );
            }
            resolvedAttendanceId = existing.id;
        }

        // Security: coach can only update their own records
        const { data: record, error: ownerError } = await (supabase as any)
            .from('coach_attendance')
            .select('id, coach_id, arrival_time, leaving_time')
            .eq('id', resolvedAttendanceId)
            .single();

        if (ownerError || !record) {
            return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
        }

        if (record.coach_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (record.leaving_time) {
            return NextResponse.json(
                { error: 'Check-out already recorded for this session' },
                { status: 409 }
            );
        }

        if (!record.arrival_time) {
            return NextResponse.json(
                { error: 'No arrival time on record – cannot compute billed hours' },
                { status: 422 }
            );
        }

        // Record leaving_time as the current server time.
        // The trigger compute_coach_attendance_time() will fire automatically and set:
        //   duration_minutes = leaving_time − arrival_time (in minutes)
        //   billed_hours     = FLOOR(duration_minutes / 15) × 0.25
        const leavingTime = new Date().toTimeString().split(' ')[0]; // "HH:MM:SS"

        const { data: updated, error: updateError } = await (supabase as any)
            .from('coach_attendance')
            .update({ leaving_time: leavingTime })
            .eq('id', resolvedAttendanceId)
            .select('id, arrival_time, leaving_time, duration_minutes, billed_hours')
            .single();

        if (updateError) {
            console.error('Check-out update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to record check-out' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Check-out recorded. Billed hours calculated.',
                attendance: {
                    id: updated.id,
                    arrival_time:     updated.arrival_time,
                    leaving_time:     updated.leaving_time,
                    duration_minutes: updated.duration_minutes,
                    billed_hours:     updated.billed_hours,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Checkout API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/coach/attendance/history?sessionId=...
 * Get attendance history for a session
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionId = request.nextUrl.searchParams.get('sessionId');
        if (!sessionId) {
            return NextResponse.json(
                { error: 'sessionId is required' },
                { status: 400 }
            );
        }

        // Get attendance record for this session
        const { data: attendance, error } = await supabase
            .from('coach_attendance')
            .select('*')
            .eq('coach_id', user.id)
            .eq('session_id', sessionId)
            .order('attendance_timestamp', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ attendance }, { status: 200 });
    } catch (error) {
        console.error('Attendance GET error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
