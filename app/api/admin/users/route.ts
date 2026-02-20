import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

async function requireAdmin() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') return null;
    return user;
}

// GET /api/admin/users — list all admins and coaches
export async function GET() {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = adminClient();
    const { data, error } = await (supabaseAdmin as any)
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .in('role', ['admin', 'coach'])
        .order('role')
        .order('full_name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// POST /api/admin/users — create a new admin or coach with email + password
export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { full_name, email, password, role } = await req.json();

    if (!full_name?.trim() || !email?.trim() || !password?.trim()) {
        return NextResponse.json({ error: 'full_name, email and password are required' }, { status: 400 });
    }
    if (!['admin', 'coach'].includes(role)) {
        return NextResponse.json({ error: 'role must be admin or coach' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseAdmin = adminClient();

    // Create Supabase auth user with email+password, auto-confirmed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // Insert profile
    const { error: profileError } = await (supabaseAdmin as any).from('profiles').insert({
        id: authData.user.id,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        role: role,
        created_by_admin: true,
    });

    if (profileError) {
        // Rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: authData.user.id });
}
