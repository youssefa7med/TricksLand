'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Coach { id: string; full_name: string; email: string; }
interface AssignedCoach {
    coach_id: string;
    profiles: { id: string; full_name: string; email: string } | null;
}
interface Rate { id: string; rate: number; effective_from: string; }
interface FeeItem { id: string; name: string; amount: number; sort_order: number; }
interface FeeItemDraft { name: string; amount: string; }

export default function AdminEditCoursePage() {
    const params = useParams();
    const courseId = params.id as string;
    const locale = params.locale as string;
    const supabase = createClient();

    // Course details
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'active' | 'archived'>('active');
    const [hourlyRate, setHourlyRate] = useState('');

    // Coach management
    const [assignedCoaches, setAssignedCoaches] = useState<AssignedCoach[]>([]);
    const [allCoaches, setAllCoaches] = useState<Coach[]>([]);
    const [rates, setRates] = useState<Record<string, Rate[]>>({});

    // Fee items
    const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
    const [newFeeItem, setNewFeeItem] = useState<FeeItemDraft>({ name: '', amount: '' });
    const [addingFeeItem, setAddingFeeItem] = useState(false);
    const [editingFeeItem, setEditingFeeItem] = useState<string | null>(null);
    const [editFeeValues, setEditFeeValues] = useState<FeeItemDraft>({ name: '', amount: '' });

    // Assign form
    const [assignCoachId, setAssignCoachId] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Rate form (open per coach)
    const [rateOpen, setRateOpen] = useState<string | null>(null);
    const [rateAmount, setRateAmount] = useState('');
    // Default to first day of current month so rates apply to all sessions this month
    const getDefaultRateDate = () => {
        const date = new Date();
        date.setDate(1);
        return date.toISOString().split('T')[0];
    };
    const [rateDate, setRateDate] = useState(getDefaultRateDate());
    const [addingRate, setAddingRate] = useState(false);

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";

    const fetchFeeItems = useCallback(async () => {
        const { data } = await (supabase as any)
            .from('course_fee_items')
            .select('id, name, amount, sort_order')
            .eq('course_id', courseId)
            .order('sort_order');
        setFeeItems(data || []);
    }, [courseId]);

    const fetchCoaches = useCallback(async () => {
        const [{ data: assigned }, { data: all }] = await Promise.all([
            (supabase as any)
                .from('course_coaches')
                .select('coach_id, profiles!course_coaches_coach_id_fkey(id, full_name, email)')
                .eq('course_id', courseId),
            supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'coach')
                .order('full_name'),
        ]);
        setAssignedCoaches((assigned as any) || []);
        setAllCoaches(all || []);

        if (assigned && assigned.length > 0) {
            const ids = assigned.map((a: any) => a.coach_id);
            const { data: rateData } = await (supabase as any)
                .from('hourly_rates')
                .select('id, coach_id, rate, effective_from')
                .eq('course_id', courseId)
                .in('coach_id', ids)
                .order('effective_from', { ascending: false });

            const byCoach: Record<string, Rate[]> = {};
            (rateData || []).forEach((r: any) => {
                if (!byCoach[r.coach_id]) byCoach[r.coach_id] = [];
                byCoach[r.coach_id].push(r);
            });
            setRates(byCoach);
        } else {
            setRates({});
        }
    }, [courseId]);

    useEffect(() => {
        const load = async () => {
            const { data, error } = await (supabase as any)
                .from('courses')
                .select('name, description, status, hourly_rate')
                .eq('id', courseId)
                .single();
            if (error) { toast.error('Course not found'); return; }
            const course = data as any;
            setName(course.name);
            setDescription(course.description || '');
            setStatus(course.status);
            setHourlyRate(course.hourly_rate != null ? String(course.hourly_rate) : '');
            await Promise.all([fetchCoaches(), fetchFeeItems()]);
            setLoading(false);
        };
        load();
    }, [courseId]);

    const handleAddFeeItem = async () => {
        if (!newFeeItem.name.trim() || !newFeeItem.amount) return;
        const amount = parseFloat(newFeeItem.amount);
        if (isNaN(amount) || amount < 0) { toast.error('Enter a valid amount'); return; }
        setAddingFeeItem(true);
        const { error } = await (supabase as any).from('course_fee_items').insert({
            course_id: courseId,
            name: newFeeItem.name.trim(),
            amount,
            sort_order: feeItems.length,
        });
        setAddingFeeItem(false);
        if (error) { toast.error(error.message); return; }
        toast.success('Fee item added');
        setNewFeeItem({ name: '', amount: '' });
        await fetchFeeItems();
    };

    const handleDeleteFeeItem = async (id: string) => {
        if (!confirm('Delete this fee item? Any student payment records for this item will also be removed.')) return;
        const { error } = await (supabase as any).from('course_fee_items').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('Fee item deleted');
        await fetchFeeItems();
    };

    const handleSaveFeeItem = async (id: string) => {
        const amount = parseFloat(editFeeValues.amount);
        if (!editFeeValues.name.trim() || isNaN(amount) || amount < 0) { toast.error('Enter valid values'); return; }
        const { error } = await (supabase as any).from('course_fee_items')
            .update({ name: editFeeValues.name.trim(), amount })
            .eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('Fee item updated');
        setEditingFeeItem(null);
        await fetchFeeItems();
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Course name is required'); return; }
        const rate = hourlyRate ? parseFloat(hourlyRate) : null;
        if (hourlyRate && (isNaN(rate!) || rate! <= 0)) { toast.error('Hourly rate must be a positive number'); return; }
        setSaving(true);
        const { error } = await (supabase as any)
            .from('courses')
            .update({ name: name.trim(), description: description.trim() || null, status, hourly_rate: rate })
            .eq('id', courseId);
        if (error) toast.error(error.message);
        else toast.success('Course saved');
        setSaving(false);
    };

    const handleAssign = async () => {
        if (!assignCoachId) return;
        setAssigning(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await (supabase as any).from('course_coaches').insert({
            course_id: courseId,
            coach_id: assignCoachId,
            assigned_by: user?.id,
        });
        if (error) toast.error(error.message);
        else { toast.success('Coach assigned'); setAssignCoachId(''); await fetchCoaches(); }
        setAssigning(false);
    };

    const handleRemove = async (coachId: string, coachName: string) => {
        if (!confirm(`Remove ${coachName} from this course?`)) return;
        const { error } = await (supabase as any)
            .from('course_coaches')
            .delete()
            .eq('course_id', courseId)
            .eq('coach_id', coachId);
        if (error) toast.error(error.message);
        else { toast.success('Coach removed'); await fetchCoaches(); }
    };

    const handleSetRate = async (coachId: string) => {
        const amt = parseFloat(rateAmount);
        if (!rateAmount || isNaN(amt) || amt <= 0) { toast.error('Enter a valid rate'); return; }
        if (!rateDate) { toast.error('Select an effective date'); return; }
        setAddingRate(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await (supabase as any).from('hourly_rates').insert({
            course_id: courseId,
            coach_id: coachId,
            rate: amt,
            effective_from: rateDate,
            created_by: user?.id,
        });
        if (error) toast.error(error.message);
        else {
            toast.success('Rate set');
            setRateOpen(null);
            setRateAmount('');
            await fetchCoaches();
        }
        setAddingRate(false);
    };

    const assignedIds = new Set(assignedCoaches.map((a) => a.coach_id));
    const unassigned = allCoaches.filter((c) => !assignedIds.has(c.id));

    if (loading) return (
        <div className="page-container flex items-center justify-center">
            <p className="text-white/70 text-lg">Loading...</p>
        </div>
    );

    return (
        <div className="page-container">
            <div className="max-w-3xl mx-auto">
                <Link href={`/${locale}/admin/courses`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    ← Back to Courses
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Edit Course</h1>
                    <p className="text-white/70">Update details, assign coaches, and set hourly rates</p>
                </div>

                {/* ── Course Details ── */}
                <GlassCard className="mb-6">
                    <h2 className="text-lg font-semibold text-white mb-5">Course Details</h2>
                    <form onSubmit={handleSaveCourse} className="space-y-4">
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Course Name *</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                        </div>
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Default Hourly Rate <span className="text-white/40">(EGP/hr, optional)</span></label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                placeholder="e.g. 200"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputClass}>
                                <option value="active" className="bg-gray-900">Active</option>
                                <option value="archived" className="bg-gray-900">Archived</option>
                            </select>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="submit" disabled={saving} className="btn-glossy disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Details'}
                            </button>
                            <Link href={`/${locale}/admin/courses`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors text-sm flex items-center">
                                Cancel
                            </Link>
                        </div>
                    </form>
                </GlassCard>

                {/* ── Fee Items ── */}
                <GlassCard className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Student Fee Items</h2>
                            <p className="text-white/40 text-xs mt-0.5">Define what students are charged (e.g., course fees, competition registration)</p>
                        </div>
                    </div>

                    {/* Existing fee items */}
                    {feeItems.length === 0 ? (
                        <p className="text-white/30 text-sm text-center py-4">No fee items defined yet</p>
                    ) : (
                        <div className="space-y-2 mb-4">
                            {feeItems.map((fi) => (
                                <div key={fi.id} className="bg-white/5 rounded-lg border border-white/10 px-4 py-3">
                                    {editingFeeItem === fi.id ? (
                                        <div className="flex gap-2 items-center flex-wrap">
                                            <input
                                                value={editFeeValues.name}
                                                onChange={(e) => setEditFeeValues(v => ({ ...v, name: e.target.value }))}
                                                className={`${inputClass} flex-1 min-w-[130px] text-sm py-1.5`}
                                            />
                                            <div className="relative w-28 flex-shrink-0">
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={editFeeValues.amount}
                                                    onChange={(e) => setEditFeeValues(v => ({ ...v, amount: e.target.value }))}
                                                    className={`${inputClass} text-sm py-1.5 pr-10`}
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">EGP</span>
                                            </div>
                                            <button onClick={() => handleSaveFeeItem(fi.id)}
                                                className="bg-primary/20 hover:bg-primary/40 text-primary text-xs px-3 py-1.5 rounded transition-colors">Save</button>
                                            <button onClick={() => setEditingFeeItem(null)}
                                                className="bg-white/10 hover:bg-white/20 text-white/60 text-xs px-3 py-1.5 rounded transition-colors">Cancel</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white text-sm font-medium">{fi.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-green-400 font-semibold text-sm">{fi.amount.toLocaleString()} EGP</span>
                                                <button
                                                    onClick={() => { setEditingFeeItem(fi.id); setEditFeeValues({ name: fi.name, amount: String(fi.amount) }); }}
                                                    className="text-white/40 hover:text-primary text-xs transition-colors">Edit</button>
                                                <button onClick={() => handleDeleteFeeItem(fi.id)}
                                                    className="text-white/30 hover:text-red-400 text-xs transition-colors">✕</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new fee item */}
                    <div className="border-t border-white/10 pt-4">
                        <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Add new fee item</p>
                        <div className="flex gap-2 flex-wrap items-center">
                            <input
                                value={newFeeItem.name}
                                onChange={(e) => setNewFeeItem(v => ({ ...v, name: e.target.value }))}
                                placeholder="e.g. Competition registration"
                                className={`${inputClass} flex-1 min-w-[150px] text-sm py-1.5`}
                            />
                            <div className="relative w-32 flex-shrink-0">
                                <input
                                    type="number" min="0" step="0.01"
                                    value={newFeeItem.amount}
                                    onChange={(e) => setNewFeeItem(v => ({ ...v, amount: e.target.value }))}
                                    placeholder="0.00"
                                    className={`${inputClass} text-sm py-1.5 pr-10`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">EGP</span>
                            </div>
                            <button
                                onClick={handleAddFeeItem}
                                disabled={addingFeeItem || !newFeeItem.name.trim() || !newFeeItem.amount}
                                className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 text-sm px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                            >
                                {addingFeeItem ? 'Adding...' : '+ Add'}
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {/* ── Coaches & Rates ── */}
                <GlassCard className="mb-6">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-5">
                        <h2 className="text-lg font-semibold text-white">Coaches &amp; Hourly Rates</h2>
                        <span className="text-white/50 text-sm">{assignedCoaches.length} assigned</span>
                    </div>

                    {/* Assign new coach */}
                    {unassigned.length > 0 && (
                        <div className="flex gap-3 mb-6 pb-6 border-b border-white/10">
                            <select
                                value={assignCoachId}
                                onChange={(e) => setAssignCoachId(e.target.value)}
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="" className="bg-gray-900">Select coach to assign...</option>
                                {unassigned.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name} — {c.email}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAssign}
                                disabled={!assignCoachId || assigning}
                                className="btn-glossy disabled:opacity-50 whitespace-nowrap"
                            >
                                {assigning ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    )}

                    {assignedCoaches.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-8">No coaches assigned yet</p>
                    ) : (
                        <div className="space-y-4">
                            {assignedCoaches.map((a) => {
                                const profile = a.profiles as any;
                                const coachRates = rates[a.coach_id] || [];
                                const currentRate = coachRates[0];
                                const isRateOpen = rateOpen === a.coach_id;

                                return (
                                    <div key={a.coach_id} className="bg-white/5 rounded-xl border border-white/10 p-4">
                                        {/* Coach header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-white font-semibold">{profile?.full_name}</p>
                                                <p className="text-white/50 text-xs">{profile?.email}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {currentRate ? (
                                                    <div className="text-right">
                                                        <p className="text-white/40 text-xs">Current rate</p>
                                                        <p className="text-primary font-bold">{currentRate.rate} EGP/hr</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-yellow-400/70 text-xs">No rate set</span>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(a.coach_id, profile?.full_name)}
                                                    className="text-red-400 hover:text-red-300 text-xs transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>

                                        {/* Set rate toggle */}
                                        <button
                                            onClick={() => {
                                                setRateOpen(isRateOpen ? null : a.coach_id);
                                                setRateAmount('');
                                                setRateDate(getDefaultRateDate());
                                            }}
                                            className="text-primary hover:text-white text-xs font-medium transition-colors mb-2"
                                        >
                                            {isRateOpen ? '▲ Cancel' : '+ Set New Rate'}
                                        </button>

                                        {/* Set rate form */}
                                        {isRateOpen && (
                                            <div className="flex gap-3 mt-2 mb-3 flex-wrap">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={rateAmount}
                                                    onChange={(e) => setRateAmount(e.target.value)}
                                                    placeholder="Rate (EGP/hr)"
                                                    className="flex-1 min-w-[120px] bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                                />
                                                <input
                                                    type="date"
                                                    value={rateDate}
                                                    onChange={(e) => setRateDate(e.target.value)}
                                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                                />
                                                <button
                                                    onClick={() => handleSetRate(a.coach_id)}
                                                    disabled={addingRate}
                                                    className="btn-glossy text-sm disabled:opacity-50"
                                                >
                                                    {addingRate ? 'Saving...' : 'Save Rate'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Rate history */}
                                        {coachRates.length > 0 && (
                                            <div className="border-t border-white/10 pt-3 mt-1">
                                                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Rate History</p>
                                                <div className="space-y-1">
                                                    {coachRates.map((r, i) => (
                                                        <div key={r.id} className="flex justify-between text-xs px-2 py-1 rounded bg-white/5">
                                                            <span className="text-white/50">
                                                                From {r.effective_from}
                                                                {i === 0 && <span className="ml-2 text-green-400 font-medium">current</span>}
                                                            </span>
                                                            <span className="text-white font-medium">{r.rate} EGP/hr</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {coachRates.length === 0 && (
                                            <p className="text-yellow-400/60 text-xs mt-1">
                                                ⚠ Set a rate — coaches cannot log sessions without one
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </GlassCard>

                {/* ── Students quick link ── */}
                <Link
                    href={`/${locale}/admin/courses/${courseId}/students`}
                    className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center transition-colors"
                >
                    <p className="text-secondary font-semibold">Manage Students</p>
                    <p className="text-white/40 text-sm mt-1">Add or remove enrolled students</p>
                </Link>
            </div>
        </div>
    );
}
