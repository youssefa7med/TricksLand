'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';

function computeHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
}

export default function CoachEditSessionPage() {
    const params = useParams();
    const router = useRouter();
    const locale = useLocale();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [userId, setUserId] = useState<string>('');

    const [form, setForm] = useState({
        course_id: '',
        session_date: '',
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

            const currentMonth = new Date().toISOString().substring(0, 7);

            const [{ data: courseData }, { data: session }] = await Promise.all([
                (supabase as any).from('course_coaches').select('courses (id, name, status)').eq('coach_id', user.id),
                (supabase as any).from('sessions').select('*').eq('id', params.id as string).eq('paid_coach_id', user.id).single(),
            ]);

            const activeCourses = (courseData || []).map((d: any) => d.courses).filter((c: any) => c && c.status === 'active');
            setCourses(activeCourses);

            if (!session) {
                toast.error('Session not found or access denied');
                router.push(`/${locale}/coach/sessions`);
                return;
            }
            if (!session.session_date.startsWith(currentMonth)) {
                toast.error('Only current month sessions can be edited');
                router.push(`/${locale}/coach/sessions`);
                return;
            }

            setForm({
                course_id: session.course_id,
                session_date: session.session_date,
                start_time: session.start_time,
                end_time: session.end_time,
                session_type: session.session_type,
                notes: session.notes || '',
            });
            setLoading(false);
        };
        load();
    }, [params.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.end_time <= form.start_time) {
            toast.error('End time must be after start time.');
            return;
        }
        setSaving(true);

        // Fetch the applicable rate from hourly_rates
        const { data: rateRow, error: rateError } = await supabase
            .from('hourly_rates')
            .select('rate')
            .eq('course_id', form.course_id)
            .eq('coach_id', userId)
            .lte('effective_from', form.session_date)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (rateError) {
            toast.error(`Failed to fetch rate: ${rateError.message}`);
            setSaving(false);
            return;
        }

        let appliedRate: number | null = null;

        // First, try to get rate from hourly_rates table (coach-specific rate)
        if (rateRow && (rateRow as any).rate !== null && (rateRow as any).rate !== undefined) {
            appliedRate = Number((rateRow as any).rate);
        }

        // Fallback: If no coach-specific rate found, check courses.hourly_rate (default rate)
        if (!appliedRate || isNaN(appliedRate) || appliedRate <= 0) {
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('hourly_rate, name')
                .eq('id', form.course_id)
                .maybeSingle();

            if (courseError) {
                console.error('Error fetching course rate:', courseError);
            }

            // Special case: If course name contains "competition", use 75 EGP
            if (courseData && (courseData as any).name) {
                const courseName = String((courseData as any).name).toLowerCase();
                if (courseName.includes('competition') || courseName.includes('competetion')) {
                    appliedRate = 75;
                } else if ((courseData as any).hourly_rate !== null && (courseData as any).hourly_rate !== undefined) {
                    appliedRate = Number((courseData as any).hourly_rate);
                }
            }
        }

        // Validate that a rate exists and is a valid number
        if (!appliedRate || isNaN(appliedRate) || appliedRate <= 0) {
            toast.error('No hourly rate found for this course. Please contact admin to set a rate before updating sessions.');
            setSaving(false);
            return;
        }

        const computedHours = computeHours(form.start_time, form.end_time);
        const subtotal = Math.round(computedHours * appliedRate * 100) / 100;

        const { error } = await (supabase as any).from('sessions').update({
            course_id: form.course_id,
            session_date: form.session_date,
            start_time: form.start_time,
            end_time: form.end_time,
            session_type: form.session_type,
            notes: form.notes || null,
            applied_rate: appliedRate,
            computed_hours: computedHours,
            subtotal: subtotal,
        }).eq('id', params.id as string);

        if (error) toast.error(error.message);
        else { toast.success('Session updated'); router.push(`/${locale}/coach/sessions`); }
        setSaving(false);
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const selectClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClass = "block text-white/80 text-sm font-medium mb-2";

    if (loading) return <div className="page-container flex items-center justify-center"><p className="text-white/70 text-lg">Loading...</p></div>;

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <Link href={`/${locale}/coach/sessions`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">← Back to Sessions</Link>
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Edit Session</h1>
                    <p className="text-white/70">Update session details (current month only)</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={labelClass}>Course *</label>
                            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className={selectClass} required>
                                {courses.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>)}
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
                            <label className={labelClass}>Notes</label>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving} className="btn-glossy disabled:opacity-50">{saving ? 'Saving...' : 'Update Session'}</button>
                            <Link href={`/${locale}/coach/sessions`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">Cancel</Link>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
