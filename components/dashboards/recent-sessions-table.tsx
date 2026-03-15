'use client';

import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '@/components/layout/GlassCard';
import { AnimatedTableRow } from '@/components/ui/animated-table-row';

interface RecentSession {
    id: string;
    session_date: string;
    computed_hours: number;
    subtotal: number;
    courses: { name: string };
    profiles: { full_name: string };
}

interface RecentSessionsTableProps {
    sessions: RecentSession[];
    labels: {
        recentSessions: string;
        date: string;
        coach: string;
        course: string;
        hours: string;
        amount: string;
    };
}

export function RecentSessionsTable({ sessions, labels }: RecentSessionsTableProps) {
    return (
        <GlassCard delay={0.2}>
            <motion.h2 
                className="text-2xl font-semibold text-white mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                {labels.recentSessions}
            </motion.h2>
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
                                {labels.coach}
                            </motion.th>
                            <motion.th 
                                className="text-left py-3 px-4 text-white/70"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {labels.course}
                            </motion.th>
                            <motion.th 
                                className="text-left py-3 px-4 text-white/70"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.25 }}
                            >
                                {labels.hours}
                            </motion.th>
                            <motion.th 
                                className="text-right py-3 px-4 text-white/70"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {labels.amount}
                            </motion.th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {sessions?.map((session, idx) => (
                                <AnimatedTableRow key={session.id} index={idx}>
                                    <td className="py-3 px-4 text-white">
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 + idx * 0.02 }}
                                        >
                                            {new Date(session.session_date).toLocaleDateString()}
                                        </motion.span>
                                    </td>
                                    <td className="py-3 px-4 text-white">{session.profiles?.full_name}</td>
                                    <td className="py-3 px-4 text-white">{session.courses?.name}</td>
                                    <td className="py-3 px-4 text-white">{session.computed_hours}h</td>
                                    <td className="py-3 px-4 text-white text-right">
                                        {`$${Number(session.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </td>
                                </AnimatedTableRow>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
}
