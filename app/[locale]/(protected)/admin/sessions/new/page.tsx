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
    // course_id → ordered list of assigned coach ids
    const [courseCoachMap, setCourseCoachMap] = useState<Record<string, string[]>>({});
    const [coachAutoFilled, setCoachAutoFilled] = useState(false);

    const [form, setForm] = useState({
        course_id: '',
        paid_coach_id: '',
        originally_scheduled_coach_id: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        session_type: 'online_session' as 'online_session' | 'offline_meeting' | 'training' | 'consultation' | 'workshop' | 'tutoring' | 'competition' | 'other',
        notes: '',
        attendance_required: true,
    });

    useEffect(() => {
        const load = async () => {
            const [{ data: coachData }, { data: courseData }, { data: ccData }] = await Promise.all([
                supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
                supabase.from('courses').select('id, name').eq('status', 'active').order('name'),
                (supabase as any).from('course_coaches').select('course_id, coach_id'),
            ]);
            setCoaches(coachData || []);
            setCourses(courseData || []);
            // Build map: course_id → [coach_id, ...]
            const map: Record<string, string[]> = {};
            for (const row of (ccData || [])) {
                if (!map[row.course_id]) map[row.course_id] = [];
                map[row.course_id].push(row.coach_id);
            }
            setCourseCoachMap(map);
        };
        load();
    }, []);

    // When course changes, auto-fill paid coach with first assigned coach
    const handleCourseChange = (courseId: string) => {
        const assignedCoaches = courseCoachMap[courseId] || [];
        const firstCoach = assignedCoaches[0] || '';
        setForm(prev => ({ ...prev, course_id: courseId, paid_coach_id: firstCoach }));
        setCoachAutoFilled(!!firstCoach);
    };

    // Helper: compute decimal hours from HH:MM strings
    const computeHours = (start: string, end: string) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
    };

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

        // ── Competition sessions: flat rate 75 EGP for ALL coaches ──────────
        if (form.session_type === 'competition') {
            const hours = computeHours(form.start_time, form.end_time);
            const subtotal = Math.round(hours * 75 * 100) / 100;
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
                applied_rate: 75,
                computed_hours: hours,
                subtotal,
                attendance_required: form.attendance_required,
            };
            const { data: insertedSession, error } = await supabase.from('sessions').insert(payload).select('id, course_id').single();
            if (error) toast.error(error.message);
            else {
                if (insertedSession?.course_id) {
                    const { data: scheduleRow } = await supabase
                        .from('course_schedules')
                        .select('id, sessions_completed')
                        .eq('course_id', insertedSession.course_id)
                        .neq('status', 'archived')
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (scheduleRow?.id) {
                        await (supabase as any)
                            .from('course_schedules')
                            .update({ sessions_completed: Number(scheduleRow.sessions_completed || 0) + 1 })
                            .eq('id', scheduleRow.id);
                    }
                }
                toast.success('Competition session logged (75 EGP/hr)');
                router.push(`/${locale}/admin/sessions`);
            }
            setLoading(false);
            return;
        }

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
            setLoading(false);
            return;
        }

        let appliedRate: number | null = null;

        // First, try to get rate from hourly_rates table (coach-specific rate)
        if (rateRow && (rateRow as any).rate !== null && (rateRow as any).rate !== undefined) {
            appliedRate = Number((rateRow as any).rate);
        }

        // 2nd fallback: paid coach's own base_hourly_rate (with annual 25% increase)
        // This must come BEFORE the generic course rate so the replacement coach's
        // personal rate is always respected.
        if (!appliedRate || isNaN(appliedRate) || appliedRate <= 0) {
            const { data: coachData } = await supabase
                .from('profiles')
                .select('base_hourly_rate, rate_effective_from')
                .eq('id', form.paid_coach_id)
                .maybeSingle();

            if (coachData && (coachData as any).base_hourly_rate != null) {
                const baseRate = Number((coachData as any).base_hourly_rate);
                const effectiveFrom = (coachData as any).rate_effective_from || form.session_date;
                const sessionDate = new Date(form.session_date);
                const effectiveDate = new Date(effectiveFrom);
                const yearsPassed = Math.floor(
                    (sessionDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
                );
                appliedRate = baseRate;
                for (let i = 0; i < yearsPassed; i++) appliedRate! *= 1.25;
                appliedRate = Math.round(appliedRate! * 100) / 100;
            }
        }

        // 3rd fallback: course-level hourly_rate (competition course name → 75)
        if (!appliedRate || isNaN(appliedRate) || appliedRate <= 0) {
            const { data: courseData } = await supabase
                .from('courses')
                .select('hourly_rate, name')
                .eq('id', form.course_id)
                .maybeSingle();

            if (courseData) {
                const courseName = String((courseData as any).name ?? '').toLowerCase();
                if (courseName.includes('competition') || courseName.includes('competetion')) {
                    appliedRate = 75;
                } else if ((courseData as any).hourly_rate != null) {
                    appliedRate = Number((courseData as any).hourly_rate);
                }
            }
        }

        // Validate that a rate exists and is a valid number
        if (!appliedRate || isNaN(appliedRate) || appliedRate <= 0) {
            toast.error('No hourly rate found for this course-coach combination. Please set a rate in the course settings or assign a coach-specific rate.');
            setLoading(false);
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
            created_by: user.id,
            originally_scheduled_coach_id: hasReplacement && form.originally_scheduled_coach_id
                ? form.originally_scheduled_coach_id
                : null,
            applied_rate: appliedRate,
            computed_hours: hours,
            subtotal: subtotal,
            attendance_required: form.attendance_required,
        };

        const { data: insertedSession, error } = await supabase.from('sessions').insert(payload).select('id, course_id').single();
        if (error) {
            toast.error(error.message);
        } else {
            if (insertedSession?.course_id) {
                const { data: scheduleRow } = await supabase
                    .from('course_schedules')
                    .select('id, sessions_completed')
                    .eq('course_id', insertedSession.course_id)
                    .neq('status', 'archived')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (scheduleRow?.id) {
                    await (supabase as any)
                        .from('course_schedules')
                        .update({ sessions_completed: Number(scheduleRow.sessions_completed || 0) + 1 })
                        .eq('id', scheduleRow.id);
                }
            }
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
                            <select value={form.course_id} onChange={(e) => handleCourseChange(e.target.value)} className={selectClass} required>
                                <option value="" className="bg-gray-900">Select a course</option>
                                {courses.map((c) => <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>
                                Paid Coach <span className="text-red-400">*</span>
                                {coachAutoFilled && (
                                    <span className="ml-2 text-xs text-primary/80 font-normal">auto-assigned · can be changed</span>
                                )}
                            </label>
                            <select
                                value={form.paid_coach_id}
                                onChange={(e) => { setForm({ ...form, paid_coach_id: e.target.value }); setCoachAutoFilled(false); }}
                                className={selectClass}
                                required
                            >
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
                            <label className={labelClass}>Activity Type <span className="text-red-400">*</span></label>
                            <select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value as any })} className={selectClass}>
                                <option value="online_session" className="bg-gray-900">Session</option>
                                <option value="offline_meeting" className="bg-gray-900">Offline Meeting</option>
                                <option value="training" className="bg-gray-900">Training</option>
                                <option value="consultation" className="bg-gray-900">Consultation</option>
                                <option value="workshop" className="bg-gray-900">Workshop</option>
                                <option value="tutoring" className="bg-gray-900">Tutoring</option>
                                <option value="competition" className="bg-gray-900">Competition (75 EGP/hr)</option>
                                <option value="other" className="bg-gray-900">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Notes <span className="text-white/40">(optional)</span></label>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any notes about this session..." className={`${inputClass} resize-none`} />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="attendance_required"
                                checked={form.attendance_required}
                                onChange={(e) => setForm({ ...form, attendance_required: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <label htmlFor="attendance_required" className="text-white/80 text-sm cursor-pointer">
                                Attendance marking required <span className="text-red-400">*</span>
                            </label>
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
