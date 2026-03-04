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
    return profile?.role === 'admin' ? user : null;
}

// PATCH /api/admin/coaches/[id]/rate — update base_hourly_rate (bypasses RLS via service role)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { base_hourly_rate, rate_effective_from, next_rate_increase_date } = await req.json();

    const rate = parseFloat(base_hourly_rate);
    if (isNaN(rate) || rate <= 0) {
        return NextResponse.json({ error: 'Invalid rate value' }, { status: 400 });
    }

    const supabaseAdmin = adminClient();
    const { error } = await (supabaseAdmin as any)
        .from('profiles')
        .update({
            base_hourly_rate: rate,
            rate_effective_from: rate_effective_from || new Date().toISOString().split('T')[0],
            next_rate_increase_date: next_rate_increase_date || null,
        })
        .eq('id', id)
        .eq('role', 'coach'); // safety: only update coaches, never admins

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
}
