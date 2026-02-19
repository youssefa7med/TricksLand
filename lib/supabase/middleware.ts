import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';

export async function updateSession(request: NextRequest, response?: NextResponse) {
    let supabaseResponse = response || NextResponse.next({
        request,
    });

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    try {
                        return request.cookies.getAll();
                    } catch (e) {
                        return [];
                    }
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            request.cookies.set(name, value)
                        );
                        supabaseResponse = NextResponse.next({
                            request,
                        });
                        // Copy existing headers/cookies from the passed response if it was recreated
                        if (response) {
                            response.headers.forEach((value, key) => {
                                supabaseResponse.headers.set(key, value);
                            });
                        }
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        );
                    } catch (e) {
                        // Ignore cookie errors in middleware
                    }
                },
            },
        }
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Helper to strip locale from path
    const getPathWithoutLocale = (path: string) => {
        const segments = path.split('/');
        // segments[0] is empty, segments[1] might be locale
        if (['en', 'ar'].includes(segments[1])) {
            return '/' + segments.slice(2).join('/');
        }
        return path;
    };

    const pathname = getPathWithoutLocale(request.nextUrl.pathname);

    // Protected routes
    const protectedPaths = ['/admin', '/coach'];
    const isProtectedRoute = protectedPaths.some((path) =>
        pathname.startsWith(path)
    );

    if (isProtectedRoute && !user) {
        // Redirect to login if not authenticated
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Check role-based access
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Admin trying to access coach routes or vice versa
        if (pathname.startsWith('/admin') && (profile as any)?.role !== 'admin') {
            const url = request.nextUrl.clone();
            url.pathname = '/coach/dashboard';
            return NextResponse.redirect(url);
        }

        if (pathname.startsWith('/coach') && (profile as any)?.role === 'admin') {
            const url = request.nextUrl.clone();
            url.pathname = '/admin/dashboard';
            return NextResponse.redirect(url);
        }

        // Redirect from root to appropriate dashboard
        // Note: next-intl handles the root redirect mostly, but if we land on /en and are logged in:
        if ((pathname === '/' || pathname === '') && user) {
            const url = request.nextUrl.clone();
            url.pathname = (profile as any)?.role === 'admin' ? '/admin/dashboard' : '/coach/dashboard';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
