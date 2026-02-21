'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AdminEditSessionPage() {
    const params = useParams();
    const router = useRouter();
    const locale = useLocale();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [hasReplacement, setHasReplacement] = useState(false);

    const [form, setForm] = useState({
        course_id: '',
        paid_coach_id: '',
        originally_scheduled_coach_id: '',
        session_date: '',
        start_time: '',
        end_time: '',
        session_type: 'online_session' as 'online_session' | 'offline_meeting' | 'training' | 'consultation' | 'workshop' | 'tutoring' | 'other',
        notes: '',
    });

    useEffect(() => {
        const load = async () => {
            const [{ data: coachData }, { data: courseData }, { data: session }] = await Promise.all([
                supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
                (supabase as any).from('courses').select('id, name').order('name'),
                (supabase as any).from('sessions').select('*').eq('id', params.id as string).single(),
            ]);
            setCoaches(coachData || []);
            setCourses(courseData || []);
            if (session) {
                setForm({
                    course_id: session.course_id,
                    paid_coach_id: session.paid_coach_id,
                    originally_scheduled_coach_id: session.originally_scheduled_coach_id || '',
                    session_date: session.session_date,
                    start_time: session.start_time,
                    end_time: session.end_time,
                    session_type: session.session_type,
                    notes: session.notes || '',
                });
                setHasReplacement(!!session.originally_scheduled_coach_id);
            }
            setLoading(false);
        };
        load();
    }, [params.id]);

    // Helper: compute decimal hours from HH:MM strings
    const computeHours = (start: string, end: string) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.end_time <= form.start_time) {
            toast.error('End time must be after start time');
            return;
        }
        setSaving(true);

        // Fetch the applicable rate from hourly_rates (most recent rate on or before session date)
        const { data: rateRow, error: rateError } = await supabase
            .from('hourly_rates')
            .select('rate')
            .eq('course_id', form.course_id)
            .eq('coach_id', form.paid_coach_id)
            .lte('effective_from', form.session_date)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (rateError) {
            toast.error(`Failed to fetch rate: ${rateError.message}`);
            setSaving(false);
            return;
        }

        // Validate that a rate exists and is a valid number
        if (!rateRow || (rateRow as any).rate === null || (rateRow as any).rate === undefined) {
            toast.error('No hourly rate found for this course-coach combination. Please set a rate before updating sessions.');
            setSaving(false);
            return;
        }

        const appliedRate = Number((rateRow as any).rate);
        if (isNaN(appliedRate) || appliedRate <= 0) {
            toast.error('Invalid rate value found. Please verify the hourly rate.');
            setSaving(false);
            return;
        }

        const hours = computeHours(form.start_time, form.end_time);
        const subtotal = Math.round(hours * appliedRate * 100) / 100;

        const payload: any = {
            course_id: form.course_id,
            paid_coach_id: form.paid_coach_id,
            session_date: form.session_date,
            start_time: form.start_time,
            end_time: form.end_time,
            session_type: form.session_type,
            notes: form.notes || null,
            originally_scheduled_coach_id: hasReplacement && form.originally_scheduled_coach_id
                ? form.originally_scheduled_coach_id
                : null,
            applied_rate: appliedRate,
            computed_hours: hours,
            subtotal: subtotal,
        };

        const { error } = await supabase.from('sessions').update(payload).eq('id', params.id as string);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Session updated');
            router.push(`/${locale}/admin/sessions`);
        }
        setSaving(false);
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const selectClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClass = "block text-white/80 text-sm font-medium mb-2";

    if (loading) return (
        <div className="page-container flex items-center justify-center">
            <p className="text-white/70 text-lg">Loading...</p>
        </div>
    );

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <Link href={`/${locale}/admin/sessions`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    ← Back to Sessions
                </Link>
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Edit Session</h1>
                    <p className="text-white/70">Update session details</p>
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
                            <label className={labelClass}>Paid Coach *</label>
                            <select value={form.paid_coach_id} onChange={(e) => setForm({ ...form, paid_coach_id: e.target.value })} className={selectClass} required>
                                {coaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="hasReplacement" checked={hasReplacement} onChange={(e) => setHasReplacement(e.target.checked)} className="w-4 h-4 rounded" />
                            <label htmlFor="hasReplacement" className="text-white/80 text-sm cursor-pointer">Replacement session</label>
                        </div>
                        {hasReplacement && (
                            <div>
                                <label className={labelClass}>Originally Scheduled Coach</label>
                                <select value={form.originally_scheduled_coach_id} onChange={(e) => setForm({ ...form, originally_scheduled_coach_id: e.target.value })} className={selectClass}>
                                    <option value="" className="bg-gray-900">Select original coach</option>
                                    {coaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                                </select>
                            </div>
                        )}
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
                            <select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value as any })} className={selectClass}>
                                <option value="online_session" className="bg-gray-900">Online Session</option>
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
                            <button type="submit" disabled={saving} className="btn-glossy disabled:opacity-50">
                                {saving ? 'Saving...' : 'Update Session'}
                            </button>
                            <Link href={`/${locale}/admin/sessions`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">Cancel</Link>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
