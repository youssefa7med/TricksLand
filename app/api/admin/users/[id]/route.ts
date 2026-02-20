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
        .select('role, id')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') return null;
    return { user, selfId: user.id };
}

// PATCH /api/admin/users/[id] — update name, email and/or password
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const adminData = await requireAdmin();
    if (!adminData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { full_name, email, password } = await req.json();

    const supabaseAdmin = adminClient();

    // Build auth update payload
    const authUpdate: Record<string, string> = {};
    if (email?.trim()) authUpdate.email = email.trim().toLowerCase();
    if (password?.trim()) {
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }
        authUpdate.password = password;
    }

    // Update auth user if needed
    if (Object.keys(authUpdate).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdate);
        if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Build profile update payload
    const profileUpdate: Record<string, string> = {};
    if (full_name?.trim()) profileUpdate.full_name = full_name.trim();
    if (email?.trim()) profileUpdate.email = email.trim().toLowerCase();

    if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await (supabaseAdmin as any)
            .from('profiles')
            .update(profileUpdate)
            .eq('id', id);
        if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — delete user (auth + profile cascade)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const adminData = await requireAdmin();
    if (!adminData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Prevent self-deletion
    if (id === adminData.selfId) {
        return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const supabaseAdmin = adminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
}
