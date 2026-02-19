'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AdminNewSessionPage() {
    const router = useRouter();
    const locale = useLocale();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [hasReplacement, setHasReplacement] = useState(false);

    const [form, setForm] = useState({
        course_id: '',
        paid_coach_id: '',
        originally_scheduled_coach_id: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        session_type: 'online_session' as 'online_session' | 'offline_meeting',
        notes: '',
    });

    useEffect(() => {
        const load = async () => {
            const [{ data: coachData }, { data: courseData }] = await Promise.all([
                supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
                supabase.from('courses').select('id, name').eq('status', 'active').order('name'),
            ]);
            setCoaches(coachData || []);
            setCourses(courseData || []);
        };
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.course_id || !form.paid_coach_id || !form.start_time || !form.end_time) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (form.end_time <= form.start_time) {
            toast.error('End time must be after start time');
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const payload: any = {
            course_id: form.course_id,
            paid_coach_id: form.paid_coach_id,
            session_date: form.session_date,
            start_time: form.start_time,
            end_time: form.end_time,
            session_type: form.session_type,
            notes: form.notes || null,
            created_by: user.id,
            originally_scheduled_coach_id: hasReplacement && form.originally_scheduled_coach_id
                ? form.originally_scheduled_coach_id
                : null,
        };

        const { error } = await supabase.from('sessions').insert(payload);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Session logged successfully');
            router.push(`/${locale}/admin/sessions`);
        }
        setLoading(false);
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const selectClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClass = "block text-white/80 text-sm font-medium mb-2";

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href={`/${locale}/admin/sessions`} className="text-white/60 hover:text-white transition-colors text-sm">
                        ← Back to Sessions
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Log Session</h1>
                    <p className="text-white/70">Record a new coaching session</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={labelClass}>Course <span className="text-red-400">*</span></label>
                            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className={selectClass} required>
                                <option value="" className="bg-gray-900">Select a course</option>
                                {courses.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Paid Coach <span className="text-red-400">*</span></label>
                            <select value={form.paid_coach_id} onChange={(e) => setForm({ ...form, paid_coach_id: e.target.value })} className={selectClass} required>
                                <option value="" className="bg-gray-900">Select coach who gets paid</option>
                                {coaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="hasReplacement"
                                checked={hasReplacement}
                                onChange={(e) => setHasReplacement(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <label htmlFor="hasReplacement" className="text-white/80 text-sm cursor-pointer">
                                This is a replacement session (different originally scheduled coach)
                            </label>
                        </div>

                        {hasReplacement && (
                            <div>
                                <label className={labelClass}>Originally Scheduled Coach</label>
                                <select value={form.originally_scheduled_coach_id} onChange={(e) => setForm({ ...form, originally_scheduled_coach_id: e.target.value })} className={selectClass}>
                                    <option value="" className="bg-gray-900">Select originally scheduled coach</option>
                                    {coaches.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>Session Date <span className="text-red-400">*</span></label>
                            <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} className={inputClass} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Start Time <span className="text-red-400">*</span></label>
                                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} required />
                            </div>
                            <div>
                                <label className={labelClass}>End Time <span className="text-red-400">*</span></label>
                                <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} required />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Session Type <span className="text-red-400">*</span></label>
                            <select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value as any })} className={selectClass}>
                                <option value="online_session" className="bg-gray-900">Online Session</option>
                                <option value="offline_meeting" className="bg-gray-900">Offline Meeting</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Notes <span className="text-white/40">(optional)</span></label>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any notes about this session..." className={`${inputClass} resize-none`} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={loading} className="btn-glossy disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Logging...' : 'Log Session'}
                            </button>
                            <Link href={`/${locale}/admin/sessions`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">
                                Cancel
                            </Link>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
