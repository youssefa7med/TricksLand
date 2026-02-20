import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') ?? '/';

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Recovery (password reset) flow → go to reset-password page
            if (type === 'recovery') {
                return NextResponse.redirect(new URL('/reset-password', requestUrl.origin));
            }
            // Any other confirmed flow → go to next or root
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }

        console.error('Auth callback error:', error.message);
    }

    // Something went wrong — redirect to login with error
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin));
}
