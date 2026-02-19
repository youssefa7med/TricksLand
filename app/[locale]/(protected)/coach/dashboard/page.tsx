import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { getLocale } from 'next-intl/server';

export default async function CoachDashboard() {
    const supabase = await createClient();
    const locale = await getLocale();

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
                <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Welcome, {profile?.full_name}!</h1>
                <p className="text-white/70 mb-8">Here's your monthly summary</p>

                {/* Monthly Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{monthlySummary?.session_count || 0}</div>
                            <div className="text-white/70">Sessions This Month</div>
                        </div>
                    </GlassCard>

                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">{monthlySummary?.total_hours || 0}</div>
                            <div className="text-white/70">Total Hours</div>
                        </div>
                    </GlassCard>

                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{formatCurrency(Number(monthlySummary?.gross_total) || 0)}</div>
                            <div className="text-white/70">Gross Total</div>
                        </div>
                    </GlassCard>

                    <GlassCard hover>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">{formatCurrency(Number(monthlySummary?.net_total) || 0)}</div>
                            <div className="text-white/70">Net Payout</div>
                        </div>
                    </GlassCard>
                </div>

                {/* Assigned Courses */}
                <GlassCard className="mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-4">Your Courses</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {assignedCourses?.map((assignment: any) => (
                            <div key={assignment.courses.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <h3 className="font-semibold text-white mb-1">{assignment.courses.name}</h3>
                                <span className={`text-sm px-2 py-1 rounded ${assignment.courses.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                                    }`}>
                                    {assignment.courses.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Recent Sessions */}
                <GlassCard>
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                        <h2 className="text-2xl font-semibold text-white">Recent Sessions</h2>
                        <a href={`/${locale}/coach/sessions`} className="btn-glossy text-sm px-4 py-2">
                            Manage Sessions
                        </a>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-white/70">Date</th>
                                    <th className="text-left py-3 px-4 text-white/70">Course</th>
                                    <th className="text-left py-3 px-4 text-white/70">Time</th>
                                    <th className="text-left py-3 px-4 text-white/70">Type</th>
                                    <th className="text-left py-3 px-4 text-white/70">Hours</th>
                                    <th className="text-left py-3 px-4 text-white/70">Rate</th>
                                    <th className="text-right py-3 px-4 text-white/70">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSessions?.map((session: any) => (
                                    <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 text-white">{new Date(session.session_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-white">{session.courses?.name}</td>
                                        <td className="py-3 px-4 text-white text-sm">{session.start_time} - {session.end_time}</td>
                                        <td className="py-3 px-4 text-white text-sm">
                                            {session.session_type === 'online_session' ? '🌐 Online' : '🏢 Offline'}
                                        </td>
                                        <td className="py-3 px-4 text-white">{session.computed_hours}h</td>
                                        <td className="py-3 px-4 text-white">{formatCurrency(session.applied_rate)}/h</td>
                                        <td className="py-3 px-4 text-white text-right font-semibold">{formatCurrency(session.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
