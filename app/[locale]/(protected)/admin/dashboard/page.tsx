import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard() {
    const supabase = await createClient();
    const locale = await getLocale();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
                    <h1 className="text-2xl md:text-4xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-white/50 text-sm mt-1">Monthly stats for <span className="text-white/80 font-medium">{monthLabel}</span></p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{coursesCount || 0}</div>
                            <div className="text-white/70">Active Courses</div>
                        </div>
                    </GlassCard>

                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">{coachesCount || 0}</div>
                            <div className="text-white/70">Total Coaches</div>
                        </div>
                    </GlassCard>

                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{studentsCount || 0}</div>
                            <div className="text-white/70">Total Students</div>
                        </div>
                    </GlassCard>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{sessionsCount || 0}</div>
                            <div className="text-white/70">Sessions This Month</div>
                            <div className="text-white/40 text-xs mt-1">{monthLabel}</div>
                        </div>
                    </GlassCard>

                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">{formatCurrency(totalPayout)}</div>
                            <div className="text-white/70">Total Payout</div>
                            <div className="text-white/40 text-xs mt-1">{monthLabel}</div>
                        </div>
                    </GlassCard>
                </div>

                {/* Recent Sessions */}
                <GlassCard>
                    <h2 className="text-2xl font-semibold text-white mb-4">Recent Sessions</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-white/70">Date</th>
                                    <th className="text-left py-3 px-4 text-white/70">Coach</th>
                                    <th className="text-left py-3 px-4 text-white/70">Course</th>
                                    <th className="text-left py-3 px-4 text-white/70">Hours</th>
                                    <th className="text-right py-3 px-4 text-white/70">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSessions?.map((session: any) => (
                                    <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 text-white">{new Date(session.session_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-white">{session.profiles?.full_name}</td>
                                        <td className="py-3 px-4 text-white">{session.courses?.name}</td>
                                        <td className="py-3 px-4 text-white">{session.computed_hours}h</td>
                                        <td className="py-3 px-4 text-white text-right">{formatCurrency(session.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Quick Actions */}
                <div className="mt-8 flex flex-wrap gap-3">
                    <a href={`/${locale}/admin/courses`} className="btn-glossy">Manage Courses</a>
                    <a href={`/${locale}/admin/coaches`} className="btn-glossy-secondary">Manage Coaches</a>
                    <a href={`/${locale}/admin/invoices`} className="btn-glossy">Generate Invoices</a>
                </div>
            </div>
        </div>
    );
}
