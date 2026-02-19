'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';

interface CoachMonthlyTotal {
    coach_id: string;
    coach_name: string;
    month: string;
    session_count: number;
    total_hours: number;
    gross_total: number;
    total_bonuses: number;
    total_discounts: number;
    net_total: number;
}

export default function AdminInvoicesPage() {
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<{ month: string; totals: CoachMonthlyTotal[]; totalPayout: number; totalSessions: number }[]>([]);
    const locale = useLocale();
    const supabase = createClient();

    // Last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().substring(0, 7);
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const results = await Promise.all(
                months.map(async (month) => {
                    const { data: totals } = await supabase
                        .from('coach_monthly_totals')
                        .select('*')
                        .eq('month', month) as { data: CoachMonthlyTotal[] | null; error: unknown };

                    const totalPayout = totals?.reduce((sum, t) => sum + Number(t.net_total), 0) || 0;
                    const totalSessions = totals?.reduce((sum, t) => sum + Number(t.session_count), 0) || 0;

                    return { month, totals: totals || [], totalPayout, totalSessions };
                })
            );
            setMonthlyData(results);
        } catch (err) {
            toast.error('Failed to load invoice data');
        } finally {
            setLoading(false);
        }
    }

    async function handleSendInvoices(month: string) {
        if (!confirm(`Send invoice emails to all coaches for ${month}?`)) return;
        const sendingToast = toast.loading(`Sending invoices for ${month}...`);
        try {
            const res = await fetch('/api/admin/invoices/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month }),
            });
            const data = await res.json();
            toast.dismiss(sendingToast);
            if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);
            const sent = data?.emailsSent ?? [];
            const succeeded = sent.filter((r: any) => r.status === 'sent').length;
            const adminFallback = sent.filter((r: any) => r.status === 'sent-to-admin').length;
            const failed = sent.filter((r: any) => r.status !== 'sent' && r.status !== 'sent-to-admin').length;
            if (adminFallback > 0) {
                toast.success(`${adminFallback} invoice(s) sent to your admin email (no verified domain yet — forward to coaches).`);
            } else if (failed > 0) {
                toast.warning(`Sent ${succeeded} invoice(s). ${failed} failed.`);
            } else {
                toast.success(`Successfully sent ${succeeded} invoice email(s) for ${month}`);
            }
        } catch (err: any) {
            toast.dismiss(sendingToast);
            toast.error(err?.message || 'Failed to send invoice emails');
        }
    }

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <div className="text-white/70 text-xl">Loading invoices...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white">Invoice Management</h1>
                    <div className="text-white/70 text-sm">Last 6 months</div>
                </div>

                <div className="space-y-6">
                    {monthlyData.map(({ month, totals, totalPayout, totalSessions }) => {
                        const monthName = new Date(month + '-01').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                        });

                        return (
                            <GlassCard key={month}>
                                <div className="flex justify-between items-start flex-wrap gap-3 mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-white mb-1">{monthName}</h2>
                                        <p className="text-white/70">
                                            {totals.length} coaches &bull; {totalSessions} sessions
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-white/70 mb-1">Total Payout</div>
                                        <div className="text-3xl font-bold text-secondary">
                                            {formatCurrency(totalPayout)}
                                        </div>
                                    </div>
                                </div>

                                {totals.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto mb-4">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        <th className="text-left py-3 px-4 text-white/70">Coach</th>
                                                        <th className="text-center py-3 px-4 text-white/70">Sessions</th>
                                                        <th className="text-center py-3 px-4 text-white/70">Hours</th>
                                                        <th className="text-right py-3 px-4 text-white/70">Gross</th>
                                                        <th className="text-right py-3 px-4 text-white/70">Bonuses</th>
                                                        <th className="text-right py-3 px-4 text-white/70">Discounts</th>
                                                        <th className="text-right py-3 px-4 text-white/70">Net Total</th>
                                                        <th className="text-center py-3 px-4 text-white/70">Preview</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {totals.map((coach) => (
                                                        <tr
                                                            key={coach.coach_id}
                                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                                        >
                                                            <td className="py-3 px-4 text-white font-medium">{coach.coach_name}</td>
                                                            <td className="py-3 px-4 text-white text-center">{coach.session_count}</td>
                                                            <td className="py-3 px-4 text-white text-center">
                                                                {Number(coach.total_hours).toFixed(1)}h
                                                            </td>
                                                            <td className="py-3 px-4 text-white text-right">
                                                                {formatCurrency(coach.gross_total)}
                                                            </td>
                                                            <td className="py-3 px-4 text-green-400 text-right">
                                                                {coach.total_bonuses > 0
                                                                    ? `+${formatCurrency(coach.total_bonuses)}`
                                                                    : '-'}
                                                            </td>
                                                            <td className="py-3 px-4 text-red-400 text-right">
                                                                {coach.total_discounts > 0
                                                                    ? `-${formatCurrency(coach.total_discounts)}`
                                                                    : '-'}
                                                            </td>
                                                            <td className="py-3 px-4 text-white text-right font-semibold text-lg">
                                                                {formatCurrency(coach.net_total)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <a
                                                                    href={`/${locale}/admin/invoices/preview?coach=${coach.coach_id}&month=${month}`}
                                                                    className="text-primary hover:text-primary/80 text-sm underline"
                                                                >
                                                                    View
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex gap-4 flex-wrap">
                                            <button
                                                onClick={() => handleSendInvoices(month)}
                                                className="btn-glossy"
                                            >
                                                Send All Invoices ({month})
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-white/70">
                                        No sessions recorded for this month
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
