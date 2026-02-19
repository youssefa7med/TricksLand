'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AdminInvoicePreviewPage() {
    const searchParams = useSearchParams();
    const coachId = searchParams.get('coach');
    const month = searchParams.get('month');
    const locale = useLocale();
    const supabase = createClient();

    const [coach, setCoach] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!coachId || !month) return;
        const load = async () => {
            const [{ data: coachData }, { data: sessionData }, { data: adjustmentData }] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email').eq('id', coachId).single(),
                supabase.from('sessions').select(`
                    id, session_date, start_time, end_time, session_type,
                    computed_hours, applied_rate, subtotal, notes,
                    courses(name)
                `).eq('paid_coach_id', coachId)
                  .gte('session_date', `${month}-01`)
                  .lt('session_date', new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 1).toISOString().split('T')[0])
                  .order('session_date'),
                supabase.from('adjustments').select('id, type, amount, notes').eq('coach_id', coachId).eq('month', month),
            ]);
            setCoach(coachData);
            setSessions(sessionData || []);
            setAdjustments(adjustmentData || []);
            setLoading(false);
        };
        load();
    }, [coachId, month]);

    const monthLabel = month ? new Date(month + '-02').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '';
    const totalSessionAmount = sessions.reduce((sum, s) => sum + Number(s.subtotal), 0);
    const totalBonuses = adjustments.filter(a => a.type === 'bonus').reduce((sum, a) => sum + Number(a.amount), 0);
    const totalDiscounts = adjustments.filter(a => a.type === 'discount').reduce((sum, a) => sum + Number(a.amount), 0);
    const finalAmount = totalSessionAmount + totalBonuses - totalDiscounts;
    const totalHours = sessions.reduce((sum, s) => sum + Number(s.computed_hours), 0);

    const handleSend = async () => {
        if (!coach?.email) { toast.error('Coach email not found'); return; }
        setSending(true);
        try {
            const res = await fetch('/api/admin/invoices/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, coach_id: coachId }),
            });
            const data = await res.json();
            if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);
            const result = data?.emailsSent?.[0];
            if (result?.status === 'sent') {
                toast.success(`Invoice emailed to ${coach.email}`);
            } else if (result?.status === 'sent-to-admin') {
                toast.success(`Invoice sent to your admin email. No verified domain yet — please forward it to ${coach.email}.`);
            } else {
                toast.error(result?.status || 'Failed to send invoice email');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to send invoice email');
        } finally {
            setSending(false);
        }
    };

    if (!coachId || !month) {
        return (
            <div className="page-container flex items-center justify-center">
                <GlassCard className="text-center p-12">
                    <p className="text-white/70 mb-4">Missing coach or month parameter.</p>
                    <Link href={`/${locale}/admin/invoices`} className="btn-glossy">Back to Invoices</Link>
                </GlassCard>
            </div>
        );
    }

    if (loading) return <div className="page-container flex items-center justify-center"><p className="text-white/70 text-lg">Loading...</p></div>;

    return (
        <div className="page-container">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link href={`/${locale}/admin/invoices`} className="text-white/60 hover:text-white transition-colors text-sm">← Back to Invoices</Link>
                    <button onClick={handleSend} disabled={sending} className="btn-glossy disabled:opacity-50">
                        {sending ? 'Sending...' : 'Send Invoice Email'}
                    </button>
                </div>

                {/* Header */}
                <GlassCard className="mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">{coach?.full_name}</h1>
                            <p className="text-white/60">{coach?.email}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-white/50 text-sm">Invoice Month</div>
                            <div className="text-2xl font-bold text-primary">{monthLabel}</div>
                        </div>
                    </div>
                </GlassCard>

                {/* Session breakdown */}
                <GlassCard className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Session Breakdown</h2>
                    {sessions.length === 0 ? (
                        <p className="text-white/50 py-4">No sessions this month</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-white/60 text-sm">Date</th>
                                        <th className="text-left py-2 px-3 text-white/60 text-sm">Course</th>
                                        <th className="text-left py-2 px-3 text-white/60 text-sm">Time</th>
                                        <th className="text-left py-2 px-3 text-white/60 text-sm">Type</th>
                                        <th className="text-right py-2 px-3 text-white/60 text-sm">Hrs</th>
                                        <th className="text-right py-2 px-3 text-white/60 text-sm">Rate</th>
                                        <th className="text-right py-2 px-3 text-white/60 text-sm">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((s: any) => (
                                        <tr key={s.id} className="border-b border-white/5">
                                            <td className="py-2 px-3 text-white text-sm">{formatDate(s.session_date)}</td>
                                            <td className="py-2 px-3 text-white text-sm">{(s.courses as any)?.name}</td>
                                            <td className="py-2 px-3 text-white text-sm">{s.start_time}–{s.end_time}</td>
                                            <td className="py-2 px-3 text-white text-sm">{s.session_type === 'online_session' ? 'Online' : 'Offline'}</td>
                                            <td className="py-2 px-3 text-white text-right text-sm">{Number(s.computed_hours).toFixed(2)}</td>
                                            <td className="py-2 px-3 text-white text-right text-sm">{formatCurrency(s.applied_rate)}</td>
                                            <td className="py-2 px-3 text-white text-right font-semibold">{formatCurrency(s.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-white/20">
                                        <td colSpan={4} className="py-2 px-3 text-white/60 text-sm">{sessions.length} sessions</td>
                                        <td className="py-2 px-3 text-white text-right font-semibold">{totalHours.toFixed(2)}</td>
                                        <td></td>
                                        <td className="py-2 px-3 text-white text-right font-bold">{formatCurrency(totalSessionAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </GlassCard>

                {/* Adjustments */}
                {adjustments.length > 0 && (
                    <GlassCard className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Adjustments</h2>
                        <div className="space-y-2">
                            {adjustments.map((a: any) => (
                                <div key={a.id} className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-3">
                                    <div>
                                        <span className={`text-xs px-2 py-1 rounded mr-3 ${a.type === 'bonus' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
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
                    </GlassCard>
                )}

                {/* Summary */}
                <GlassCard>
                    <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between text-white/70">
                            <span>{sessions.length} sessions ({totalHours.toFixed(2)} hrs)</span>
                            <span>{formatCurrency(totalSessionAmount)}</span>
                        </div>
                        {totalBonuses > 0 && (
                            <div className="flex justify-between text-green-300">
                                <span>Total Bonuses</span>
                                <span>+{formatCurrency(totalBonuses)}</span>
                            </div>
                        )}
                        {totalDiscounts > 0 && (
                            <div className="flex justify-between text-red-300">
                                <span>Total Discounts</span>
                                <span>-{formatCurrency(totalDiscounts)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-white font-bold text-xl border-t border-white/20 pt-3">
                            <span>Final Payable Amount</span>
                            <span className="text-secondary">{formatCurrency(finalAmount)}</span>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
