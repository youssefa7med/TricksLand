import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';

export default async function CoachAdjustmentsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adjustments } = await supabase
        .from('adjustments')
        .select('id, month, type, amount, notes, created_at')
        .eq('coach_id', user.id)
        .order('month', { ascending: false });

    // Group by month
    const byMonth: Record<string, any[]> = {};
    (adjustments || []).forEach((a: any) => {
        if (!byMonth[a.month]) byMonth[a.month] = [];
        byMonth[a.month].push(a);
    });

    return (
        <div className="page-container">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">My Adjustments</h1>
                    <p className="text-white/70">Bonuses and discounts applied to your account</p>
                </div>

                {Object.keys(byMonth).length === 0 ? (
                    <GlassCard>
                        <p className="text-white/70 text-center py-12">No adjustments yet</p>
                    </GlassCard>
                ) : (
                    Object.entries(byMonth).map(([month, items]) => {
                        const totalBonuses = items.filter(a => a.type === 'bonus').reduce((s, a) => s + Number(a.amount), 0);
                        const totalDiscounts = items.filter(a => a.type === 'discount').reduce((s, a) => s + Number(a.amount), 0);
                        return (
                            <GlassCard key={month} className="mb-6">
                                <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                                    <h2 className="text-xl font-semibold text-white">{month}</h2>
                                    <div className="flex gap-4 text-sm">
                                        {totalBonuses > 0 && <span className="text-green-300">+{formatCurrency(totalBonuses)}</span>}
                                        {totalDiscounts > 0 && <span className="text-red-300">-{formatCurrency(totalDiscounts)}</span>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {items.map((a: any) => (
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
                            </GlassCard>
                        );
                    })
                )}
            </div>
        </div>
    );
}
