import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { getLocale, getTranslations } from 'next-intl/server';
import { motion } from 'motion/react';
import { StatCard } from '@/components/ui/stat-card';
import { AnimatedSection } from '@/components/ui/animated-section';
import { GlassCard } from '@/components/layout/GlassCard';

export default async function CoachDashboard() {
    const supabase = await createClient();
    const locale = await getLocale();
    const t = await getTranslations('pages.coachDashboard');
    const tc = await getTranslations('common');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get coach profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single() as { data: { full_name: string } | null; error: unknown };

    // Get current month
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Get this month's summary
    const { data: monthlySummary } = await supabase
        .from('coach_monthly_totals')
        .select('*')
        .eq('coach_id', user.id)
        .eq('month', currentMonth)
        .single() as { data: { session_count: number; total_hours: number; gross_total: number; net_total: number } | null; error: unknown };

    // Get assigned courses
    const { data: assignedCourses } = await supabase
        .from('course_coaches')
        .select(`
      courses (
        id,
        name,
        status
      )
    `)
        .eq('coach_id', user.id);

    // Get recent sessions
    const { data: recentSessions } = await supabase
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

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <AnimatedSection 
                    title={`${t('welcomeMessage')} ${profile?.full_name}!`}
                    subtitle={t('monthlySummary')}
                    delay={0}
                >
                    {/* Monthly Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            label={t('sessionsThisMonth')}
                            value={monthlySummary?.session_count || 0}
                            icon="📚"
                            delay={0}
                        />
                        <StatCard
                            label={t('totalHours')}
                            value={`${monthlySummary?.total_hours || 0}h`}
                            icon="⏱️"
                            delay={0.1}
                        />
                        <StatCard
                            label={t('grossTotal')}
                            value={`$${Number(monthlySummary?.gross_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon="💵"
                            delay={0.2}
                        />
                        <StatCard
                            label={t('netPayout')}
                            value={`$${Number(monthlySummary?.net_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon="💰"
                            delay={0.3}
                        />
                    </div>

                    {/* Assigned Courses */}
                    <GlassCard className="mb-8" delay={0.1}>
                        <motion.h2 
                            className="text-2xl font-semibold text-white mb-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {t('yourCourses')}
                        </motion.h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {assignedCourses?.map((assignment: any, idx: number) => (
                                <motion.div
                                    key={assignment.courses.id}
                                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 + idx * 0.05 }}
                                    whileHover={{ y: -2, borderColor: "rgba(56, 189, 248, 0.5)" }}
                                >
                                    <h3 className="font-semibold text-white mb-1">{assignment.courses.name}</h3>
                                    <motion.span 
                                        className={`inline-block text-sm px-2 py-1 rounded ${assignment.courses.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 + idx * 0.05 }}
                                    >
                                        {assignment.courses.status}
                                    </motion.span>
                                </motion.div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Recent Sessions */}
                    <GlassCard delay={0.15}>
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                            <motion.h2 
                                className="text-2xl font-semibold text-white"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {t('recentSessions')}
                            </motion.h2>
                            <motion.a 
                                href={`/${locale}/coach/sessions`} 
                                className="btn-glossy text-sm px-4 py-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {t('manageSessions')}
                            </motion.a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <motion.th 
                                            className="text-left py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            {t('date')}
                                        </motion.th>
                                        <motion.th 
                                            className="text-left py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.15 }}
                                        >
                                            {t('course')}
                                        </motion.th>
                                        <motion.th 
                                            className="text-left py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            {t('time')}
                                        </motion.th>
                                        <motion.th 
                                            className="text-left py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.25 }}
                                        >
                                            {t('type')}
                                        </motion.th>
                                        <motion.th 
                                            className="text-left py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                        >
                                            {t('hours')}
                                        </motion.th>
                                        <motion.th 
                                            className="text-left py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.35 }}
                                        >
                                            {t('rate')}
                                        </motion.th>
                                        <motion.th 
                                            className="text-right py-3 px-4 text-white/70"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            {t('amount')}
                                        </motion.th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSessions?.map((session: any, idx: number) => (
                                        <motion.tr
                                            key={session.id}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + (idx % 10) * 0.03 }}
                                            whileHover={{ backgroundColor: "rgba(56, 189, 248, 0.05)", x: 4 }}
                                        >
                                            <td className="py-3 px-4 text-white">{new Date(session.session_date).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-white">{session.courses?.name}</td>
                                            <td className="py-3 px-4 text-white text-sm">{session.start_time} - {session.end_time}</td>
                                            <td className="py-3 px-4 text-white text-sm">
                                                {session.session_type === 'online_session' ? `🌐 ${tc('online')}` : `🏢 ${tc('offline')}`}
                                            </td>
                                            <td className="py-3 px-4 text-white">{session.computed_hours}h</td>
                                            <td className="py-3 px-4 text-white">{formatCurrency(session.applied_rate)}/h</td>
                                            <td className="py-3 px-4 text-white text-right font-semibold">{formatCurrency(session.subtotal)}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </AnimatedSection>
            </div>
        </div>
    );
}
