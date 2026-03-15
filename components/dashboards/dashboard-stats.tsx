'use client';

import { StatCard } from '@/components/ui/stat-card';
import { motion } from 'motion/react';

interface DashboardStatsProps {
    stats: {
        courses: number | null;
        coaches: number | null;
        students: number | null;
        sessions: number | null;
        payout: number;
    };
    labels: {
        activeCourses: string;
        totalCoaches: string;
        totalStudents: string;
        sessionsThisMonth: string;
        totalPayout: string;
        monthLabel: string;
    };
}

export function DashboardStats({ stats, labels }: DashboardStatsProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label={labels.activeCourses}
                    value={stats.courses || 0}
                    icon="📚"
                    delay={0}
                />
                <StatCard
                    label={labels.totalCoaches}
                    value={stats.coaches || 0}
                    icon="👨‍🏫"
                    delay={0.1}
                />
                <StatCard
                    label={labels.totalStudents}
                    value={stats.students || 0}
                    icon="👥"
                    delay={0.2}
                />
                <StatCard
                    label={labels.sessionsThisMonth}
                    value={stats.sessions || 0}
                    icon="📅"
                    delay={0.3}
                />
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                    label={labels.totalPayout}
                    value={`$${stats.payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon="💰"
                    delay={0.1}
                />
            </div>
        </motion.div>
    );
}
