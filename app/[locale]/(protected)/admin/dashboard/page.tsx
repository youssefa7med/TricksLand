import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { getLocale, getTranslations } from 'next-intl/server';
import { motion } from 'motion/react';
import { DashboardStats } from '@/components/dashboards/dashboard-stats';
import { RecentSessionsTable } from '@/components/dashboards/recent-sessions-table';
import { AnimatedSection } from '@/components/ui/animated-section';

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
                <AnimatedSection
                    title={t('title')}
                    subtitle={`${t('monthlyStats')} ${monthLabel}`}
                    delay={0}
                >
                    <DashboardStats
                        stats={{
                            courses: coursesCount,
                            coaches: coachesCount,
                            students: studentsCount,
                            sessions: sessionsCount,
                            payout: totalPayout,
                        }}
                        labels={{
                            activeCourses: t('activeCourses'),
                            totalCoaches: t('totalCoaches'),
                            totalStudents: t('totalStudents'),
                            sessionsThisMonth: t('sessionsThisMonth'),
                            totalPayout: t('totalPayout'),
                            monthLabel,
                        }}
                    />

                    <div className="mt-8">
                        <RecentSessionsTable
                            sessions={recentSessions as any}
                            labels={{
                                recentSessions: t('recentSessions'),
                                date: t('date'),
                                coach: t('coach'),
                                course: t('course'),
                                hours: t('hours'),
                                amount: t('amount'),
                            }}
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 flex flex-wrap gap-3">
                        <motion.a 
                            href={`/${locale}/admin/courses`} 
                            className="btn-glossy"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {t('manageCourses')}
                        </motion.a>
                        <motion.a 
                            href={`/${locale}/admin/coaches`} 
                            className="btn-glossy-secondary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {t('manageCoaches')}
                        </motion.a>
                        <motion.a 
                            href={`/${locale}/admin/invoices`} 
                            className="btn-glossy"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {t('generateInvoices')}
                        </motion.a>
                    </div>
                </AnimatedSection>
            </div>
        </div>
    );
}
