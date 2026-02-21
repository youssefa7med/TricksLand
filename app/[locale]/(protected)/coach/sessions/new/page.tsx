'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Compute hours between two HH:MM strings (same-day only)
function computeHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
}

export default function CoachNewSessionPage() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const searchParams = useSearchParams();
    const preselectedCourseId = searchParams.get('course_id') || '';

    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [userId, setUserId] = useState<string>('');
    // Preview rate shown to coach before submitting
    const [ratePreview, setRatePreview] = useState<number | null>(null);

    const [form, setForm] = useState({
        course_id: preselectedCourseId,
        session_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        session_type: 'online_session' as string,
        notes: '',
    });

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data: assignments } = await supabase
                .from('course_coaches')
                .select('courses (id, name, status)')
                .eq('coach_id', user.id);

            const activeCourses = (assignments || [])
                .map((d: any) => d.courses)
                .filter((c: any) => c && c.status === 'active');

            setCourses(activeCourses);
        };
        load();
    }, []);

    // Fetch applicable rate whenever course or date changes
    useEffect(() => {
        if (!form.course_id || !userId || !form.session_date) {
            setRatePreview(null);
            return;
        }
        const fetchRate = async () => {
            const { data, error } = await supabase
                .from('hourly_rates')
                .select('rate')
                .eq('course_id', form.course_id)
                .eq('coach_id', userId)
                .lte('effective_from', form.session_date)
                .order('effective_from', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error || !data || (data as any).rate === null || (data as any).rate === undefined) {
                setRatePreview(null);
            } else {
                setRatePreview(Number((data as any).rate));
            }
        };
        fetchRate();
    }, [form.course_id, form.session_date, userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.course_id || !form.start_time || !form.end_time) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (form.end_time <= form.start_time) {
            toast.error('End time must be after start time.');
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // ─── Fetch applicable rate from hourly_rates ───────────────────────
        const { data: rateRow, error: rateError } = await supabase
            .from('hourly_rates')
            .select('rate')
            .eq('course_id', form.course_id)
            .eq('coach_id', user.id)
            .lte('effective_from', form.session_date)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (rateError) {
            toast.error(`Failed to fetch rate: ${rateError.message}`);
            setLoading(false);
            return;
        }

        // Validate that a rate exists and is a valid number
        if (!rateRow || (rateRow as any).rate === null || (rateRow as any).rate === undefined) {
            toast.error('No hourly rate found for this course. Please contact admin to set a rate before logging sessions.');
            setLoading(false);
            return;
        }

        const appliedRate = Number((rateRow as any).rate);
        if (isNaN(appliedRate) || appliedRate <= 0) {
            toast.error('Invalid rate value found. Please contact admin to verify the hourly rate.');
            setLoading(false);
            return;
        }

        const computedHours = computeHours(form.start_time, form.end_time);
        const subtotal = Math.round(computedHours * appliedRate * 100) / 100;
        // ──────────────────────────────────────────────────────────────────

        const { error } = await supabase.from('sessions').insert({
            course_id: form.course_id,
            paid_coach_id: user.id,
            session_date: form.session_date,
            start_time: form.start_time,
            end_time: form.end_time,
            session_type: form.session_type,
            notes: form.notes || null,
            created_by: user.id,
            // Explicitly set computed fields — don't rely solely on trigger
            applied_rate: appliedRate,
            computed_hours: computedHours,
            subtotal: subtotal,
        } as any);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Session logged successfully');
            router.push(`/${locale}/coach/sessions`);
        }
        setLoading(false);
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const selectClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClass = "block text-white/80 text-sm font-medium mb-2";

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <Link href={`/${locale}/coach/sessions`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    ← Back to Sessions
                </Link>
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Log Session</h1>
                    <p className="text-white/70">Record a new coaching session</p>
                </div>

                {courses.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-2">You have no active courses assigned.</p>
                            <p className="text-white/50 text-sm">Contact your admin to be assigned to a course.</p>
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className={labelClass}>Course *</label>
                                <select
                                    value={form.course_id}
                                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                                    className={selectClass}
                                    required
                                >
                                    <option value="" className="bg-gray-900">Select a course</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Session Date *</label>
                                <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} className={inputClass} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Start Time *</label>
                                    <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>End Time *</label>
                                    <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} required />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Activity Type *</label>
                                <select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })} className={selectClass}>
                                    <option value="online_session" className="bg-gray-900">Session</option>
                                    <option value="offline_meeting" className="bg-gray-900">Offline Meeting</option>
                                    <option value="training" className="bg-gray-900">Training</option>
                                    <option value="consultation" className="bg-gray-900">Consultation</option>
                                    <option value="workshop" className="bg-gray-900">Workshop</option>
                                    <option value="tutoring" className="bg-gray-900">Tutoring</option>
                                    <option value="other" className="bg-gray-900">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Notes <span className="text-white/40">(optional)</span></label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={`${inputClass} resize-none`} placeholder="Any notes..." />
                            </div>

                            {/* Rate preview */}
                            {form.course_id && (
                                <div className={`rounded-lg px-4 py-3 text-sm ${ratePreview !== null && ratePreview > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                                    {ratePreview !== null && ratePreview > 0 ? (
                                        <p className="text-primary font-medium">
                                            💰 Rate: <span className="font-bold">{ratePreview} EGP/hr</span>
                                            {form.start_time && form.end_time && form.end_time > form.start_time && (
                                                <span className="ml-2 text-white/60">
                                                    → {computeHours(form.start_time, form.end_time)}h × {ratePreview} = <strong>{Math.round(computeHours(form.start_time, form.end_time) * ratePreview * 100) / 100} EGP</strong>
                                                </span>
                                            )}
                                        </p>
                                    ) : (
                                        <p className="text-yellow-400">⚠ No rate set for this course. Contact admin to set a rate before logging sessions.</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={loading} className="btn-glossy disabled:opacity-50">
                                    {loading ? 'Logging...' : 'Log Session'}
                                </button>
                                <Link href={`/${locale}/coach/sessions`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
