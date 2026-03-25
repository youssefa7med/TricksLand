import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CoachDashboardClient } from '@/components/dashboards/coach-dashboard-client';

export default async function CoachDashboard() {
    const supabase = await createClient();
    const locale = await getLocale();
    const t = await getTranslations('pages.coachDashboard');
    const tc = await getTranslations('common');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get coach profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle() as { data: { full_name: string } | null; error: unknown };
    if (profileError) {
        console.error('Coach dashboard profile query failed:', profileError);
    }

    // Get current month
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Get this month's summary
    const { data: monthlySummary, error: monthlySummaryError } = await supabase
        .from('coach_monthly_totals')
        .select('*')
        .eq('coach_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle() as { data: { session_count: number; total_hours: number; gross_total: number; net_total: number } | null; error: unknown };
    if (monthlySummaryError) {
        console.error('Coach dashboard monthly summary query failed:', monthlySummaryError);
    }

    // Get assigned courses
    const { data: assignedCourses, error: assignedCoursesError } = await supabase
        .from('course_coaches')
        .select(`
      courses (
        id,
        name,
        status
      )
    `)
        .eq('coach_id', user.id);
    if (assignedCoursesError) {
        console.error('Coach dashboard assigned courses query failed:', assignedCoursesError);
    }

    // Guard against nullable relations to prevent runtime crashes
    const safeAssignedCourses = (assignedCourses || [])
        .filter((row: any) => row?.courses)
        .map((row: any) => ({
            courses: {
                id: row.courses.id,
                name: row.courses.name,
                status: row.courses.status,
            },
        }));

    // Get recent sessions
        const { data: recentSessions, error: recentSessionsError } = await supabase
        .from('sessions')
        .select(`
      id,
      session_date,
      start_time,
      end_time,
      computed_hours,
      applied_rate,
      subtotal,
      session_type,
      courses (name)
    `)
        .eq('paid_coach_id', user.id)
        .order('session_date', { ascending: false })
        .limit(10);
    if (recentSessionsError) {
        console.error('Coach dashboard recent sessions query failed:', recentSessionsError);
    }

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white">{t('welcomeMessage')} {profile?.full_name}!</h1>
                    <p className="text-white/70 mb-8">{t('monthlySummary')}</p>
                </div>

                <CoachDashboardClient
                    stats={{
                        sessions: monthlySummary?.session_count ?? null,
                        hours: monthlySummary?.total_hours ?? null,
                        gross: Number(monthlySummary?.gross_total || 0),
                        net: Number(monthlySummary?.net_total || 0),
                    }}
                    courses={safeAssignedCourses as any}
                    sessions={(recentSessions || []) as any}
                    labels={{
                        yourCourses: t('yourCourses'),
                        recentSessions: t('recentSessions'),
                        manageSessions: t('manageSessions'),
                        date: t('date'),
                        course: t('course'),
                        time: t('time'),
                        type: t('type'),
                        hours: t('hours'),
                        rate: t('rate'),
                        amount: t('amount'),
                        sessionsThisMonth: t('sessionsThisMonth'),
                        totalHours: t('totalHours'),
                        grossTotal: t('grossTotal'),
                        netPayout: t('netPayout'),
                        online: tc('online'),
                        offline: tc('offline'),
                    }}
                    locale={locale}
                    t={t}
                    tc={tc}
                />
            </div>
        </div>
    );
}
