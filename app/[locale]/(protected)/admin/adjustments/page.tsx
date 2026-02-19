'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterCoach, setFilterCoach] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    const currentMonth = new Date().toISOString().substring(0, 7);

    const [form, setForm] = useState({
        coach_id: '',
        month: currentMonth,
        type: 'bonus' as 'bonus' | 'discount',
        amount: '',
        notes: '',
    });

    const fetchAdjustments = async () => {
        setLoading(true);
        let query = supabase
            .from('adjustments')
            .select(`
                id, month, type, amount, notes, created_at,
                profiles!adjustments_coach_id_fkey (full_name)
            `)
            .order('created_at', { ascending: false });

        if (filterCoach) query = query.eq('coach_id', filterCoach);
        if (filterMonth) query = query.eq('month', filterMonth);

        const { data, error } = await query;
        if (error) toast.error(error.message);
        else setAdjustments(data || []);
        setLoading(false);
    };

    useEffect(() => {
        const loadCoaches = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name');
            setCoaches(data || []);
        };
        loadCoaches();
    }, []);

    useEffect(() => { fetchAdjustments(); }, [filterCoach, filterMonth]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.coach_id || !form.amount || !form.notes.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Amount must be a positive number');
            return;
        }
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await supabase.from('adjustments').insert({
            coach_id: form.coach_id,
            month: form.month,
            type: form.type,
            amount: amt,
            notes: form.notes.trim(),
            created_by: user.id,
        } as any);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Adjustment added');
            setForm({ coach_id: '', month: currentMonth, type: 'bonus', amount: '', notes: '' });
            setShowForm(false);
            fetchAdjustments();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this adjustment?')) return;
        const { error } = await supabase.from('adjustments').delete().eq('id', id);
        if (error) toast.error(error.message);
        else { toast.success('Adjustment deleted'); fetchAdjustments(); }
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const selectClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Adjustments</h1>
                        <p className="text-white/70">Bonuses and discounts per coach per month</p>
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn-glossy">+ Add Adjustment</button>
                </div>

                {/* Add Form */}
                {showForm && (
                    <GlassCard className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">New Adjustment</h2>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/80 text-sm font-medium mb-2">Coach *</label>
                                <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })} className={selectClass} required>
                                    <option value="" className="bg-gray-900">Select coach</option>
                                    {coaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-white/80 text-sm font-medium mb-2">Month *</label>
                                <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className={inputClass} required />
                            </div>
                            <div>
                                <label className="block text-white/80 text-sm font-medium mb-2">Type *</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className={selectClass}>
                                    <option value="bonus" className="bg-gray-900">Bonus</option>
                                    <option value="discount" className="bg-gray-900">Discount</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-white/80 text-sm font-medium mb-2">Amount (EGP) *</label>
                                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className={inputClass} required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-white/80 text-sm font-medium mb-2">Reason / Notes *</label>
                                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Reason for this adjustment" className={inputClass} required />
                            </div>
                            <div className="md:col-span-2 flex gap-3">
                                <button type="submit" disabled={saving} className="btn-glossy disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Add Adjustment'}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                )}

                {/* Filters */}
                <GlassCard className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={filterCoach} onChange={(e) => setFilterCoach(e.target.value)} className={selectClass}>
                            <option value="" className="bg-gray-900">All Coaches</option>
                            {coaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                        </select>
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className={inputClass} placeholder="Filter by month" />
                    </div>
                </GlassCard>

                {loading ? (
                    <GlassCard><p className="text-white/70 text-center py-12">Loading...</p></GlassCard>
                ) : adjustments.length === 0 ? (
                    <GlassCard><p className="text-white/70 text-center py-12">No adjustments found</p></GlassCard>
                ) : (
                    <GlassCard>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-white/70">Coach</th>
                                        <th className="text-left py-3 px-4 text-white/70">Month</th>
                                        <th className="text-left py-3 px-4 text-white/70">Type</th>
                                        <th className="text-left py-3 px-4 text-white/70">Amount</th>
                                        <th className="text-left py-3 px-4 text-white/70">Notes</th>
                                        <th className="text-right py-3 px-4 text-white/70">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adjustments.map((a: any) => (
                                        <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-white">{(a.profiles as any)?.full_name}</td>
                                            <td className="py-3 px-4 text-white">{a.month}</td>
                                            <td className="py-3 px-4">
                                                <span className={`text-xs px-2 py-1 rounded ${a.type === 'bonus' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                    {a.type === 'bonus' ? 'Bonus' : 'Discount'}
                                                </span>
                                            </td>
                                            <td className={`py-3 px-4 font-semibold ${a.type === 'bonus' ? 'text-green-300' : 'text-red-300'}`}>
                                                {a.type === 'bonus' ? '+' : '-'}{formatCurrency(a.amount)}
                                            </td>
                                            <td className="py-3 px-4 text-white/70 text-sm">{a.notes}</td>
                                            <td className="py-3 px-4 text-right">
                                                <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
