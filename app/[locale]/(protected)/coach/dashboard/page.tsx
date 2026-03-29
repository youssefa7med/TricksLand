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
    let profile: { full_name: string } | null = null;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
        
        if (error) {
            console.error('Coach dashboard profile query failed:', error);
        } else {
            profile = data;
        }
    } catch (err) {
        console.error('Coach dashboard profile query exception:', err);
    }

    // Get current month (using Egypt timezone - UTC+2)
    const now = new Date();
    const egyptTime = new Date(now.getTime() + (2 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
    const currentMonth = egyptTime.toISOString().substring(0, 7);

    // Get this month's summary
    let monthlySummary: { session_count: number; total_hours: number; gross_total: number; net_total: number } | null = null;
    try {
        const { data, error } = await supabase
            .from('coach_monthly_totals')
            .select('*')
            .eq('coach_id', user.id)
            .eq('month', currentMonth)
            .maybeSingle();
        
        if (error) {
            console.error('Coach dashboard monthly summary query failed:', error);
        } else {
            monthlySummary = data;
        }
    } catch (err) {
        console.error('Coach dashboard monthly summary query exception:', err);
    }

    // Get assigned courses - simplified query without nested select
    let assignedCourses: any[] = [];
    try {
        const { data, error } = await supabase
            .from('course_coaches')
            .select('course_id')
            .eq('coach_id', user.id);
        
        if (error) {
            console.error('Coach dashboard course coaches query failed:', error);
        } else if (data && data.length > 0) {
            // Get courses data separately to avoid RLS issues
            const courseIds = (data as Array<{ course_id: string | null }>)
                .map((cc) => cc.course_id)
                .filter((id): id is string => !!id);
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('id, name, status')
                .in('id', courseIds);
            
            if (coursesError) {
                console.error('Coach dashboard courses query failed:', coursesError);
            } else {
                assignedCourses = ((coursesData || []) as Array<{ id: string; name: string; status: string }>).map((course) => ({
                    courses: {
                        id: course.id,
                        name: course.name,
                        status: course.status,
                    },
                }));
            }
        }
    } catch (err) {
        console.error('Coach dashboard assigned courses query exception:', err);
    }

    // Get recent sessions - without nested course join
    let recentSessions: any[] = [];
    try {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, session_date, start_time, end_time, computed_hours, applied_rate, subtotal, session_type, course_id')
            .eq('paid_coach_id', user.id)
            .order('session_date', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Coach dashboard sessions query failed:', error);
        } else {
            recentSessions = data || [];
            
            // Get course names for sessions that have course_id
            const courseIds = [...new Set(recentSessions.map(s => s.course_id).filter(cid => cid))];
            if (courseIds.length > 0) {
                const { data: coursesData } = await supabase
                    .from('courses')
                    .select('id, name')
                    .in('id', courseIds);
                
                const courseMap = new Map(
                    ((coursesData || []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name])
                );
                recentSessions = recentSessions.map(session => ({
                    ...session,
                    courses: session.course_id ? { name: courseMap.get(session.course_id) } : null,
                }));
            }
        }
    } catch (err) {
        console.error('Coach dashboard sessions query exception:', err);
    }

    const coachName = (profile as { full_name?: string } | null)?.full_name || 'Coach';
    const summary = monthlySummary as {
        session_count?: number | null;
        total_hours?: number | null;
        gross_total?: number | null;
        net_total?: number | null;
    } | null;
    const stats = {
        sessions: summary?.session_count ?? null,
        hours: summary?.total_hours ?? null,
        gross: Number(summary?.gross_total || 0),
        net: Number(summary?.net_total || 0),
    };

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white">{t('welcomeMessage')} {coachName}!</h1>
                    <p className="text-white/70 mb-8">{t('monthlySummary')}</p>
                </div>

                <CoachDashboardClient
                    stats={stats}
                    courses={assignedCourses}
                    sessions={recentSessions}
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
                />
            </div>
        </div>
    );
}
