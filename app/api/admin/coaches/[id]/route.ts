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
    const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return null;
    return user;
}

// PATCH /api/admin/coaches/[id] — update coach name/email
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { full_name } = await req.json();

    const supabaseAdmin = adminClient();
    const { error } = await (supabaseAdmin as any)
        .from('profiles')
        .update({ full_name: full_name.trim() })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
}

// DELETE /api/admin/coaches/[id] — delete coach (auth user + profile cascade)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabaseAdmin = adminClient();

    // Deleting from auth.users cascades to profiles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
}
