import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { DeleteSessionButton } from '@/components/sessions/DeleteSessionButton';

export default async function CoachSessionsPage() {
    const supabase = await createClient();
    const locale = await getLocale();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get all sessions for this coach
    const { data: sessions } = await supabase
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
      notes,
      courses (id, name),
      originally_scheduled_coach:profiles!sessions_originally_scheduled_coach_id_fkey (full_name)
    `)
        .eq('paid_coach_id', user.id)
        .order('session_date', { ascending: false });

    // Get assigned courses for the add session form
    const { data: assignedCourses } = await supabase
        .from('course_coaches')
        .select('courses (id, name)')
        .eq('coach_id', user.id);

    // Group sessions by month
    const sessionsByMonth = sessions?.reduce((acc: any, session: any) => {
        const month = session.session_date.substring(0, 7);
        if (!acc[month]) acc[month] = [];
        acc[month].push(session);
        return acc;
    }, {});

    const currentMonth = new Date().toISOString().substring(0, 7);

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">My Sessions</h1>
                        <p className="text-white/70">View and manage your coaching sessions</p>
                    </div>
                    <Link href={`/${locale}/coach/sessions/new`} className="btn-glossy">
                        + Add New Session
                    </Link>
                </div>

                {/* Sessions grouped by month */}
                {Object.keys(sessionsByMonth || {}).map((month) => {
                    const monthSessions = sessionsByMonth![month];
                    const isCurrentMonth = month === currentMonth;
                    const monthTotal = monthSessions.reduce((sum: number, s: any) => sum + Number(s.subtotal), 0);

                    return (
                        <GlassCard key={month} className="mb-6">
                            <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
                                <h2 className="text-2xl font-semibold text-white">
                                    {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                    {isCurrentMonth && <span className="ml-2 text-sm text-primary">(Current Month)</span>}
                                </h2>
                                <div className="text-right">
                                    <div className="text-sm text-white/70">Total</div>
                                    <div className="text-2xl font-bold text-secondary">{formatCurrency(monthTotal)}</div>
                                </div>
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
                                            <th className="text-right py-3 px-4 text-white/70">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthSessions.map((session: any) => (
                                            <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 text-white">{formatDate(session.session_date)}</td>
                                                <td className="py-3 px-4 text-white">
                                                    {session.courses?.name ?? <span className="text-white/40 italic">Course unavailable</span>}
                                                    {session.originally_scheduled_coach && (
                                                        <div className="text-xs text-yellow-400">
                                                            Replaced: {session.originally_scheduled_coach.full_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-white text-sm">{session.start_time} - {session.end_time}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs px-2 py-1 rounded ${session.session_type === 'online_session'
                                                            ? 'bg-blue-500/20 text-blue-300'
                                                            : 'bg-purple-500/20 text-purple-300'
                                                        }`}>
                                                        {session.session_type === 'online_session' ? 'Online' : 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-white">{session.computed_hours}h</td>
                                                <td className="py-3 px-4 text-white">{formatCurrency(session.applied_rate)}</td>
                                                <td className="py-3 px-4 text-white text-right font-semibold">{formatCurrency(session.subtotal)}</td>
                                                <td className="py-3 px-4 text-right">
                                                    {isCurrentMonth && (
                                                        <div className="flex justify-end gap-2">
                                                            <Link
                                                                href={`/${locale}/coach/sessions/edit/${session.id}`}
                                                                className="text-primary hover:text-primary-light transition-colors text-sm"
                                                            >
                                                                Edit
                                                            </Link>
                                                            <DeleteSessionButton sessionId={session.id} />
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    );
                })}

                {(!sessions || sessions.length === 0) && (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-4">No sessions logged yet</p>
                            <Link href={`/${locale}/coach/sessions/new`} className="btn-glossy inline-block">
                                Log Your First Session
                            </Link>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
