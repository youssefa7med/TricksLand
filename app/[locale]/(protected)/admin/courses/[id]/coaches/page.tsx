'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminCourseCoachesPage() {
    const params = useParams();
    const courseId = params.id as string;
    const supabase = createClient();

    const [course, setCourse] = useState<any>(null);
    const [assignedCoaches, setAssignedCoaches] = useState<any[]>([]);
    const [allCoaches, setAllCoaches] = useState<any[]>([]);
    const [rates, setRates] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);

    // Assign form
    const [assignCoachId, setAssignCoachId] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Rate form
    const [rateCoachId, setRateCoachId] = useState('');
    const [rateAmount, setRateAmount] = useState('');
    const [rateEffectiveFrom, setRateEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
    const [addingRate, setAddingRate] = useState(false);

    const fetchData = async () => {
        const [{ data: courseData }, { data: assignedData }, { data: allCoachData }] = await Promise.all([
            supabase.from('courses').select('id, name').eq('id', courseId).single(),
            supabase.from('course_coaches').select('coach_id, profiles!course_coaches_coach_id_fkey(id, full_name, email)').eq('course_id', courseId),
            supabase.from('profiles').select('id, full_name, email').eq('role', 'coach').order('full_name'),
        ]);

        setCourse(courseData);
        setAssignedCoaches(assignedData || []);
        setAllCoaches(allCoachData || []);

        // Fetch rates for each assigned coach
        if (assignedData && assignedData.length > 0) {
            const coachIds = assignedData.map((a: any) => a.coach_id);
            const { data: rateData } = await supabase
                .from('hourly_rates')
                .select('id, coach_id, rate, effective_from, created_at')
                .eq('course_id', courseId)
                .in('coach_id', coachIds)
                .order('effective_from', { ascending: false });

            const ratesByCoach: Record<string, any[]> = {};
            (rateData || []).forEach((r: any) => {
                if (!ratesByCoach[r.coach_id]) ratesByCoach[r.coach_id] = [];
                ratesByCoach[r.coach_id].push(r);
            });
            setRates(ratesByCoach);
        }

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [courseId]);

    const assignedCoachIds = new Set(assignedCoaches.map((a: any) => a.coach_id));
    const unassignedCoaches = allCoaches.filter((c) => !assignedCoachIds.has(c.id));

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignCoachId) { toast.error('Select a coach'); return; }
        setAssigning(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAssigning(false); return; }

        const { error } = await supabase.from('course_coaches').insert({
            course_id: courseId,
            coach_id: assignCoachId,
            assigned_by: user.id,
        } as any);

        if (error) toast.error(error.message);
        else { toast.success('Coach assigned'); setAssignCoachId(''); fetchData(); }
        setAssigning(false);
    };

    const handleRemove = async (coachId: string, coachName: string) => {
        if (!confirm(`Remove ${coachName} from this course?`)) return;
        const { error } = await supabase.from('course_coaches').delete().eq('course_id', courseId).eq('coach_id', coachId);
        if (error) toast.error(error.message);
        else { toast.success('Coach removed'); fetchData(); }
    };

    const handleSetRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rateCoachId || !rateAmount || !rateEffectiveFrom) { toast.error('Fill all rate fields'); return; }
        const amt = parseFloat(rateAmount);
        if (isNaN(amt) || amt <= 0) { toast.error('Rate must be a positive number'); return; }
        setAddingRate(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAddingRate(false); return; }

        const { error } = await supabase.from('hourly_rates').insert({
            course_id: courseId,
            coach_id: rateCoachId,
            rate: amt,
            effective_from: rateEffectiveFrom,
            created_by: user.id,
        } as any);

        if (error) toast.error(error.message);
        else { toast.success('Rate set'); setRateAmount(''); fetchData(); }
        setAddingRate(false);
    };

    if (loading) return <div className="page-container flex items-center justify-center"><p className="text-white/70 text-lg">Loading...</p></div>;

    const selectClass = "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";
    const inputClass = "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";

    return (
        <div className="page-container">
            <div className="max-w-5xl mx-auto">
                <Link href="/admin/courses" className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">← Back to Courses</Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Coaches — {course?.name}</h1>
                    <p className="text-white/70">Assign coaches and manage their hourly rates for this course</p>
                </div>

                {/* Assign section */}
                {unassignedCoaches.length > 0 && (
                    <GlassCard className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Assign New Coach</h2>
                        <form onSubmit={handleAssign} className="flex gap-4">
                            <select value={assignCoachId} onChange={(e) => setAssignCoachId(e.target.value)} className={`flex-1 ${selectClass}`}>
                                <option value="" className="bg-gray-900">Select coach to assign</option>
                                {unassignedCoaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                            </select>
                            <button type="submit" disabled={assigning} className="btn-glossy disabled:opacity-50">
                                {assigning ? 'Assigning...' : 'Assign Coach'}
                            </button>
                        </form>
                    </GlassCard>
                )}

                {/* Set Rate section */}
                {assignedCoaches.length > 0 && (
                    <GlassCard className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Set Hourly Rate</h2>
                        <form onSubmit={handleSetRate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select value={rateCoachId} onChange={(e) => setRateCoachId(e.target.value)} className={selectClass} required>
                                <option value="" className="bg-gray-900">Select coach</option>
                                {assignedCoaches.map((a: any) => (
                                    <option key={a.coach_id} value={a.coach_id} className="bg-gray-900">{(a.profiles as any)?.full_name}</option>
                                ))}
                            </select>
                            <input type="number" step="0.01" min="0.01" value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} placeholder="Rate (EGP/hr)" className={inputClass} required />
                            <input type="date" value={rateEffectiveFrom} onChange={(e) => setRateEffectiveFrom(e.target.value)} className={inputClass} required />
                            <button type="submit" disabled={addingRate} className="btn-glossy disabled:opacity-50">
                                {addingRate ? 'Saving...' : 'Set Rate'}
                            </button>
                        </form>
                        <p className="text-white/40 text-xs mt-2">Rates are append-only — new entries take effect from the specified date. Old rates are preserved for historical accuracy.</p>
                    </GlassCard>
                )}

                {/* Assigned coaches with rate history */}
                {assignedCoaches.length === 0 ? (
                    <GlassCard><p className="text-white/70 text-center py-12">No coaches assigned yet</p></GlassCard>
                ) : (
                    <div className="space-y-4">
                        {assignedCoaches.map((a: any) => {
                            const coachRates = rates[a.coach_id] || [];
                            const currentRate = coachRates[0];
                            return (
                                <GlassCard key={a.coach_id}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{(a.profiles as any)?.full_name}</h3>
                                            <p className="text-white/50 text-sm">{(a.profiles as any)?.email}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {currentRate && (
                                                <div className="text-right">
                                                    <div className="text-white/50 text-xs">Current Rate</div>
                                                    <div className="text-primary font-bold text-lg">{formatCurrency(currentRate.rate)}/hr</div>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleRemove(a.coach_id, (a.profiles as any)?.full_name)}
                                                className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    {coachRates.length > 0 && (
                                        <div>
                                            <p className="text-white/50 text-xs uppercase font-semibold tracking-wider mb-2">Rate History</p>
                                            <div className="space-y-1">
                                                {coachRates.map((r: any) => (
                                                    <div key={r.id} className="flex justify-between text-sm bg-white/5 rounded px-3 py-1.5">
                                                        <span className="text-white/60">From {r.effective_from}</span>
                                                        <span className="text-white font-medium">{formatCurrency(r.rate)}/hr</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {coachRates.length === 0 && (
                                        <p className="text-yellow-400/70 text-sm">⚠ No rate set — sessions cannot be logged without a rate</p>
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
