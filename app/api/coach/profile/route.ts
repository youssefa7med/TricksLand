import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

/**
 * GET /api/coach/profile
 * Returns the authenticated user's own profile using service role key.
 * This bypasses RLS and any client-side singleton cache so the coach
 * always sees the latest base_hourly_rate set by admin.
 */
export async function GET() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await adminClient()
        .from('profiles')
        .select('id, full_name, email, role, bio, base_hourly_rate, rate_effective_from, next_rate_increase_date')
        .eq('id', user.id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'no-store' } });
}
