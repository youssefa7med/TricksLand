import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

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
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('id, session_date, paid_coach_id')
            .eq('id', sessionId)
            .single();

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
        const { data: attendance, error: insertError } = await supabase
            .from('coach_attendance')
            .insert({
                coach_id: user.id,
                session_id: sessionId,
                latitude,
                longitude,
                distance_from_academy: distance,
                attendance_timestamp: new Date().toISOString(),
                status: 'present',
            })
            .select()
            .single();

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
                    id: attendance.id,
                    distance,
                    timestamp: attendance.attendance_timestamp,
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
