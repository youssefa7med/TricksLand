import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AdminDashboardClient } from '@/components/dashboards/admin-dashboard-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard() {
    const supabase = await createClient();
    const locale = await getLocale();
    const t = await getTranslations('pages.adminDashboard');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const monthLabel = now.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

    // Get total courses count
    const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    // Get total coaches count
    const { count: coachesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'coach');

    // Get total students count
    const { count: studentsCount } = await (supabase as any)
        .from('students')
        .select('*', { count: 'exact', head: true });

    // Get this month's sessions count
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().substring(0, 10);
    const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('session_date', `${currentMonth}-01`)
        .lt('session_date', nextMonth);

    // Get this month's total payout
    const { data: monthlyTotals } = await supabase
        .from('coach_monthly_totals')
        .select('*')
        .eq('month', currentMonth);

    const totalPayout = (monthlyTotals as { net_total: number }[] | null)?.reduce((sum, record) => sum + Number(record.net_total), 0) || 0;

    // Get recent sessions
    const { data: recentSessions } = await supabase
        .from('sessions')
        .select(`
      id,
      session_date,
      start_time,
      end_time,
      computed_hours,
      subtotal,
      courses (name),
      profiles!sessions_paid_coach_id_fkey (full_name)
    `)
        .order('session_date', { ascending: false })
        .limit(5);

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white">{t('title')}</h1>
                    <p className="text-white/50 text-sm mt-1">{t('monthlyStats')} <span className="text-white/80 font-medium">{monthLabel}</span></p>
                </div>

                <AdminDashboardClient
                    stats={{
                        courses: coursesCount,
                        coaches: coachesCount,
                        students: studentsCount,
                        sessions: sessionsCount,
                        payout: totalPayout,
                    }}
                    sessions={recentSessions as any}
                    locale={locale}
                    labels={{
                        activeCourses: t('activeCourses'),
                        totalCoaches: t('totalCoaches'),
                        totalStudents: t('totalStudents'),
                        sessionsThisMonth: t('sessionsThisMonth'),
                        totalPayout: t('totalPayout'),
                        recentSessions: t('recentSessions'),
                        date: t('date'),
                        coach: t('coach'),
                        course: t('course'),
                        hours: t('hours'),
                        amount: t('amount'),
                        manageCourses: t('manageCourses'),
                        manageCoaches: t('manageCoaches'),
                        generateInvoices: t('generateInvoices'),
                    }}
                />
            </div>
        </div>
    );
}
