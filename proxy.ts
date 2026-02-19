import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const handleI18nRouting = createMiddleware({
        locales: ['en', 'ar'],
        defaultLocale: 'en'
    });

    const response = handleI18nRouting(request);

    return await updateSession(request, response);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
