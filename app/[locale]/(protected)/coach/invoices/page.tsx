'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function CoachInvoicesPage() {
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [sessionsByMonth, setSessionsByMonth] = useState<Record<string, any[]>>({});
    const [adjustmentsByMonth, setAdjustmentsByMonth] = useState<Record<string, any[]>>({});
    const supabase = createClient();

    // Last 12 months
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().substring(0, 7);
    });

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: totals, error } = await supabase
                .from('coach_monthly_totals')
                .select('*')
                .eq('coach_id', user.id)
                .order('month', { ascending: false });

            if (error) toast.error(error.message);
            else setMonthlyData(totals || []);
            setLoading(false);
        };
        load();
    }, []);

    const loadMonthDetail = async (month: string) => {
        if (sessionsByMonth[month]) {
            setExpanded(expanded === month ? null : month);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: sessions }, { data: adjustments }] = await Promise.all([
            supabase
                .from('sessions')
                .select('id, session_date, start_time, end_time, session_type, computed_hours, applied_rate, subtotal, notes, courses (name)')
                .eq('paid_coach_id', user.id)
                .gte('session_date', `${month}-01`)
                .lt('session_date', new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 1).toISOString().split('T')[0])
                .order('session_date'),
            supabase
                .from('adjustments')
                .select('id, type, amount, notes')
                .eq('coach_id', user.id)
                .eq('month', month),
        ]);

        setSessionsByMonth((prev) => ({ ...prev, [month]: sessions || [] }));
        setAdjustmentsByMonth((prev) => ({ ...prev, [month]: adjustments || [] }));
        setExpanded(month);
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <p className="text-white/70 text-lg">Loading invoices...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">My Invoices</h1>
                    <p className="text-white/70">Monthly earnings breakdown</p>
                </div>

                {monthlyData.length === 0 ? (
                    <GlassCard>
                        <p className="text-white/70 text-center py-12">No invoice data yet. Start logging sessions to see your earnings here.</p>
                    </GlassCard>
                ) : (
                    <div className="space-y-4">
                        {monthlyData.map((row: any) => {
                            const monthName = new Date(row.month + '-01').toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                            });
                            const isOpen = expanded === row.month;
                            const sessions = sessionsByMonth[row.month] || [];
                            const adjustments = adjustmentsByMonth[row.month] || [];

                            return (
                                <GlassCard key={row.month}>
                                    {/* Month Header */}
                                    <button
                                        onClick={() => loadMonthDetail(row.month)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-semibold text-white">{monthName}</h2>
                                                <p className="text-white/50 text-sm mt-1">
                                                    {row.session_count} session{row.session_count !== 1 ? 's' : ''} &bull; {Number(row.total_hours).toFixed(1)}h total
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-xs text-white/50 mb-1">Net Payable</div>
                                                    <div className="text-2xl font-bold text-secondary">{formatCurrency(row.net_total)}</div>
                                                </div>
                                                <span className="text-white/40 text-lg">{isOpen ? '▲' : '▼'}</span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Detail */}
                                    {isOpen && (
                                        <div className="mt-6 border-t border-white/10 pt-6 space-y-6">
                                            {/* Sessions Breakdown */}
                                            <div>
                                                <h3 className="text-white/70 text-xs uppercase font-semibold tracking-wider mb-3">Sessions</h3>
                                                {sessions.length === 0 ? (
                                                    <p className="text-white/40 text-sm italic">No sessions found</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b border-white/10">
                                                                    <th className="text-left py-2 px-2 text-white/50 font-medium">Date</th>
                                                                    <th className="text-left py-2 px-2 text-white/50 font-medium">Course</th>
                                                                    <th className="text-left py-2 px-2 text-white/50 font-medium">Time</th>
                                                                    <th className="text-left py-2 px-2 text-white/50 font-medium">Type</th>
                                                                    <th className="text-right py-2 px-2 text-white/50 font-medium">Hrs</th>
                                                                    <th className="text-right py-2 px-2 text-white/50 font-medium">Rate</th>
                                                                    <th className="text-right py-2 px-2 text-white/50 font-medium">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sessions.map((s: any) => (
                                                                    <tr key={s.id} className="border-b border-white/5">
                                                                        <td className="py-2 px-2 text-white">{formatDate(s.session_date)}</td>
                                                                        <td className="py-2 px-2 text-white">{(s.courses as any)?.name}</td>
                                                                        <td className="py-2 px-2 text-white/70">{s.start_time}–{s.end_time}</td>
                                                                        <td className="py-2 px-2">
                                                                            <span className={`text-xs px-2 py-0.5 rounded ${s.session_type === 'online_session' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                                                                {s.session_type === 'online_session' ? 'Online' : 'Offline'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2 px-2 text-white/70 text-right">{s.computed_hours}h</td>
                                                                        <td className="py-2 px-2 text-white/70 text-right">{formatCurrency(s.applied_rate)}</td>
                                                                        <td className="py-2 px-2 text-white font-medium text-right">{formatCurrency(s.subtotal)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Adjustments */}
                                            {adjustments.length > 0 && (
                                                <div>
                                                    <h3 className="text-white/70 text-xs uppercase font-semibold tracking-wider mb-3">Adjustments</h3>
                                                    <div className="space-y-2">
                                                        {adjustments.map((a: any) => (
                                                            <div key={a.id} className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`text-xs px-2 py-1 rounded ${a.type === 'bonus' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                                        {a.type === 'bonus' ? 'Bonus' : 'Discount'}
                                                                    </span>
                                                                    <span className="text-white/70 text-sm">{a.notes}</span>
                                                                </div>
                                                                <span className={`font-semibold ${a.type === 'bonus' ? 'text-green-300' : 'text-red-300'}`}>
                                                                    {a.type === 'bonus' ? '+' : '-'}{formatCurrency(a.amount)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Summary */}
                                            <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                                <div className="flex justify-between text-sm text-white/60">
                                                    <span>Gross ({row.session_count} sessions)</span>
                                                    <span>{formatCurrency(row.gross_total)}</span>
                                                </div>
                                                {Number(row.total_bonuses) > 0 && (
                                                    <div className="flex justify-between text-sm text-green-300">
                                                        <span>Bonuses</span>
                                                        <span>+{formatCurrency(row.total_bonuses)}</span>
                                                    </div>
                                                )}
                                                {Number(row.total_discounts) > 0 && (
                                                    <div className="flex justify-between text-sm text-red-300">
                                                        <span>Discounts</span>
                                                        <span>-{formatCurrency(row.total_discounts)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2">
                                                    <span>Net Payable</span>
                                                    <span className="text-secondary">{formatCurrency(row.net_total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
