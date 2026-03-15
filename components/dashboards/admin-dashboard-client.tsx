'use client';

import { motion } from 'motion/react';
import { DashboardStats } from './dashboard-stats';
import { RecentSessionsTable } from './recent-sessions-table';
import { AnimatedSection } from '@/components/ui/animated-section';

interface AdminDashboardClientProps {
    stats: {
        courses: number | null;
        coaches: number | null;
        students: number | null;
        sessions: number | null;
        payout: number;
    };
    sessions: any[];
    locale: string;
    labels: {
        activeCourses: string;
        totalCoaches: string;
        totalStudents: string;
        sessionsThisMonth: string;
        totalPayout: string;
        recentSessions: string;
        date: string;
        coach: string;
        course: string;
        hours: string;
        amount: string;
        manageCourses: string;
        manageCoaches: string;
        generateInvoices: string;
    };
    formatCurrency: (amount: number) => string;
}

export function AdminDashboardClient({
    stats,
    sessions,
    locale,
    labels,
    formatCurrency,
}: AdminDashboardClientProps) {
    return (
        <AnimatedSection delay={0}>
            <DashboardStats
                stats={{
                    courses: stats.courses,
                    coaches: stats.coaches,
                    students: stats.students,
                    sessions: stats.sessions,
                    payout: stats.payout,
                }}
                labels={{
                    activeCourses: labels.activeCourses,
                    totalCoaches: labels.totalCoaches,
                    totalStudents: labels.totalStudents,
                    sessionsThisMonth: labels.sessionsThisMonth,
                    totalPayout: labels.totalPayout,
                    monthLabel: '',
                }}
            />

            <div className="mt-8">
                <RecentSessionsTable
                    sessions={sessions}
                    labels={{
                        recentSessions: labels.recentSessions,
                        date: labels.date,
                        coach: labels.coach,
                        course: labels.course,
                        hours: labels.hours,
                        amount: labels.amount,
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
                    {labels.manageCourses}
                </motion.a>
                <motion.a 
                    href={`/${locale}/admin/coaches`} 
                    className="btn-glossy-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {labels.manageCoaches}
                </motion.a>
                <motion.a 
                    href={`/${locale}/admin/invoices`} 
                    className="btn-glossy"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {labels.generateInvoices}
                </motion.a>
            </div>
        </AnimatedSection>
    );
}
