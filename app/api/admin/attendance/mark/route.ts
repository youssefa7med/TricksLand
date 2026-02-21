import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function verifyAdmin(supabase: any): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    return !!(profile && (profile as any).role === 'admin');
}

/**
 * POST /api/admin/attendance/mark
 * Admin manually marks a coach as attended for a session (bypasses GPS check).
 * Body: { sessionId: string, coachId: string, status?: 'present' | 'excused' }
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!(await verifyAdmin(supabase))) return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });

        const body = await request.json();
        const { sessionId, coachId, status = 'present' } = body;

        if (!sessionId || !coachId) return NextResponse.json({ error: 'sessionId and coachId are required' }, { status: 400 });
        if (!['present', 'excused'].includes(status)) return NextResponse.json({ error: 'status must be "present" or "excused"' }, { status: 400 });

        // Verify session exists
        const { data: session, error: sessionError } = await (supabase as any)
            .from('sessions')
            .select('id, session_date, paid_coach_id')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        // Check if attendance already exists for this session+coach
        const { data: existing } = await (supabase as any)
            .from('coach_attendance')
            .select('id')
            .eq('session_id', sessionId)
            .eq('coach_id', coachId)
            .single();

        if (existing) {
            const { error } = await (supabase as any)
                .from('coach_attendance')
                .update({ status, marked_by_admin: true })
                .eq('id', (existing as any).id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true, updated: true });
        }

        // Insert new attendance record (no GPS, admin override)
        const { data: attendance, error: insertError } = await (supabase as any)
            .from('coach_attendance')
            .insert({
                coach_id: coachId,
                session_id: sessionId,
                latitude: 0,
                longitude: 0,
                distance_from_academy: 0,
                attendance_timestamp: new Date().toISOString(),
                status,
                marked_by_admin: true,
            })
            .select()
            .single();

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
        return NextResponse.json({ success: true, attendance }, { status: 201 });
    } catch (error) {
        console.error('Admin attendance mark error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/attendance/mark
 * Admin removes an attendance record.
 * Body: { attendanceId: string }
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!(await verifyAdmin(supabase))) return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });

        const body = await request.json();
        const { attendanceId } = body;
        if (!attendanceId) return NextResponse.json({ error: 'attendanceId is required' }, { status: 400 });

        const { error } = await (supabase as any)
            .from('coach_attendance')
            .delete()
            .eq('id', attendanceId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin attendance delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
