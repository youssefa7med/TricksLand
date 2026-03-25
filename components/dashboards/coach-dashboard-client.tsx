'use client';

import { motion } from 'motion/react';
import { StatCard } from '@/components/ui/stat-card';
import { AnimatedSection } from '@/components/ui/animated-section';
import { GlassCard } from '@/components/layout/GlassCard';

interface CoachDashboardClientProps {
    stats: {
        sessions: number | null;
        hours: number | null;
        gross: number;
        net: number;
    };
    courses: any[];
    sessions: any[];
    labels: {
        yourCourses: string;
        recentSessions: string;
        manageSessions: string;
        date: string;
        course: string;
        time: string;
        type: string;
        hours: string;
        rate: string;
        amount: string;
        sessionsThisMonth: string;
        totalHours: string;
        grossTotal: string;
        netPayout: string;
        online: string;
        offline: string;
    };
    locale: string;
}

function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CoachDashboardClient({
    stats,
    courses,
    sessions,
    labels,
    locale,
}: CoachDashboardClientProps) {
    return (
        <AnimatedSection delay={0}>
            {/* Monthly Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label={labels.sessionsThisMonth}
                    value={stats.sessions || 0}
                    icon="📚"
                    delay={0}
                />
                <StatCard
                    label={labels.totalHours}
                    value={`${stats.hours || 0}h`}
                    icon="⏱️"
                    delay={0.1}
                />
                <StatCard
                    label={labels.grossTotal}
                    value={`$${stats.gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon="💵"
                    delay={0.2}
                />
                <StatCard
                    label={labels.netPayout}
                    value={`$${stats.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                    {labels.yourCourses}
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {courses && courses.length > 0 ? (
                        courses.map((assignment: any, idx: number) => (
                            <motion.div
                                key={assignment?.courses?.id || `assignment-${idx}`}
                                className="bg-white/5 rounded-lg p-4 border border-white/10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 + idx * 0.05 }}
                                whileHover={{ y: -2, borderColor: "rgba(56, 189, 248, 0.5)" }}
                            >
                                <h3 className="font-semibold text-white mb-1">{assignment?.courses?.name || '-'}</h3>
                                <motion.span 
                                    className={`inline-block text-sm px-2 py-1 rounded ${assignment?.courses?.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 + idx * 0.05 }}
                                >
                                    {assignment?.courses?.status || 'unknown'}
                            </motion.span>
                        </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-white/50">
                            No courses assigned yet
                        </div>
                    )}
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
                        {labels.recentSessions}
                    </motion.h2>
                    <motion.a 
                        href={`/${locale}/coach/sessions`} 
                        className="btn-glossy text-sm px-4 py-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {labels.manageSessions}
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
                                    {labels.date}
                                </motion.th>
                                <motion.th 
                                    className="text-left py-3 px-4 text-white/70"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    {labels.course}
                                </motion.th>
                                <motion.th 
                                    className="text-left py-3 px-4 text-white/70"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {labels.time}
                                </motion.th>
                                <motion.th 
                                    className="text-left py-3 px-4 text-white/70"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                >
                                    {labels.type}
                                </motion.th>
                                <motion.th 
                                    className="text-left py-3 px-4 text-white/70"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {labels.hours}
                                </motion.th>
                                <motion.th 
                                    className="text-left py-3 px-4 text-white/70"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    {labels.rate}
                                </motion.th>
                                <motion.th 
                                    className="text-right py-3 px-4 text-white/70"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {labels.amount}
                                </motion.th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions && sessions.length > 0 ? (
                                sessions.map((session: any, idx: number) => (
                                    <motion.tr
                                        key={session.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + (idx % 10) * 0.03 }}
                                        whileHover={{ backgroundColor: "rgba(56, 189, 248, 0.05)", x: 4 }}
                                    >
                                        <td className="py-3 px-4 text-white">{new Date(session.session_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-white">{session.courses?.name || '-'}</td>
                                        <td className="py-3 px-4 text-white text-sm">{session.start_time} - {session.end_time}</td>
                                        <td className="py-3 px-4 text-white text-sm">
                                            {session.session_type === 'online_session' ? `🌐 ${labels.online}` : `🏢 ${labels.offline}`}
                                        </td>
                                        <td className="py-3 px-4 text-white">{session.computed_hours}h</td>
                                        <td className="py-3 px-4 text-white">{formatCurrency(session.applied_rate)}/h</td>
                                        <td className="py-3 px-4 text-white text-right font-semibold">{formatCurrency(session.subtotal)}</td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-8 px-4 text-center text-white/50">
                                        No sessions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </AnimatedSection>
    );
}
