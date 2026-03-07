'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function computeHours(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
}

function getBaseRate(base: number, effectiveFrom: string, sessionDate: string): number {
    const sessionDt = new Date(sessionDate);
    const effectiveDt = new Date(effectiveFrom);
    const yearsPassed = Math.max(0, Math.floor((sessionDt.getTime() - effectiveDt.getTime()) / (1000 * 60 * 60 * 24 * 365)));
    let rate = base;
    for (let i = 0; i < yearsPassed; i++) rate *= 1.25;
    return Math.round(rate * 100) / 100;
}

export default function LogActivityPage() {
    const params = useParams();
    const locale = params.locale as string;
    const router = useRouter();
    const supabase = createClient();
    const t = useTranslations('pages.sessions');
    const tc = useTranslations('common');

    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState<string>('');
    const [baseRate, setBaseRate] = useState<number | null>(null);
    const [rateEffectiveFrom, setRateEffectiveFrom] = useState<string>('');

    const [form, setForm] = useState({
        activity_type: 'kit_arrangement',
        activity_description: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
    });

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push(`/${locale}/login`); return; }
            setUserId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('base_hourly_rate, rate_effective_from')
                .eq('id', user.id)
                .maybeSingle();

            if (profile && (profile as any).base_hourly_rate) {
                setBaseRate(Number((profile as any).base_hourly_rate));
                setRateEffectiveFrom((profile as any).rate_effective_from || new Date().toISOString().split('T')[0]);
            }
        };
        load();
    }, []);

    const computedRate =
        baseRate && rateEffectiveFrom && form.session_date
            ? getBaseRate(baseRate, rateEffectiveFrom, form.session_date)
            : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.start_time || !form.end_time) {
            toast.error(t('fillRequired'));
            return;
        }
        if (form.end_time <= form.start_time) {
            toast.error('End time must be after start time.');
            return;
        }
        if (form.activity_type === 'other' && !form.activity_description.trim()) {
            toast.error(t('descriptionRequired'));
            return;
        }
        if (!computedRate) {
            toast.error(t('noBaseRate'));
            return;
        }

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSubmitting(false); return; }

        const computedHours = computeHours(form.start_time, form.end_time);
        const subtotal = Math.round(computedHours * computedRate * 100) / 100;

        const { error } = await supabase.from('sessions').insert({
            course_id: null,
            paid_coach_id: user.id,
            session_date: form.session_date,
            start_time: form.start_time,
            end_time: form.end_time,
            session_type: 'offline_meeting',
            activity_type: form.activity_type,
            activity_description: form.activity_type === 'other' ? form.activity_description.trim() : null,
            notes: null,
            created_by: user.id,
            applied_rate: computedRate,
            computed_hours: computedHours,
            subtotal,
            attendance_required: false,
        } as any);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(t('activityLogged'));
            router.push(`/${locale}/coach/sessions?tab=activities`);
        }
        setSubmitting(false);
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const selectClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClass = "block text-white/80 text-sm font-medium mb-2";

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <Link
                    href={`/${locale}/coach/sessions?tab=activities`}
                    className="text-white/60 hover:text-white transition-colors text-sm mb-8 block"
                >
                    ← {t('backToSessions')}
                </Link>
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('logActivity')}</h1>
                    <p className="text-white/70">{t('logActivitySubtitle')}</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Activity Type */}
                        <div>
                            <label className={labelClass}>{t('activityType')} *</label>
                            <select
                                value={form.activity_type}
                                onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
                                className={selectClass}
                                required
                            >
                                <option value="kit_arrangement" className="bg-gray-900">{t('kitArrangement')}</option>
                                <option value="supervision" className="bg-gray-900">{t('supervision')}</option>
                                <option value="other" className="bg-gray-900">{t('other')}</option>
                            </select>
                        </div>

                        {/* Description — only for "other" */}
                        {form.activity_type === 'other' && (
                            <div>
                                <label className={labelClass}>{t('activityDescription')} *</label>
                                <textarea
                                    value={form.activity_description}
                                    onChange={(e) => setForm({ ...form, activity_description: e.target.value })}
                                    rows={3}
                                    className={`${inputClass} resize-none`}
                                    placeholder={t('activityDescriptionPlaceholder')}
                                    required
                                />
                            </div>
                        )}

                        {/* Date */}
                        <div>
                            <label className={labelClass}>{tc('date')} *</label>
                            <input
                                type="date"
                                value={form.session_date}
                                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                                className={inputClass}
                                required
                            />
                        </div>

                        {/* Start / End time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('startTime')} *</label>
                                <input
                                    type="time"
                                    value={form.start_time}
                                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t('endTime')} *</label>
                                <input
                                    type="time"
                                    value={form.end_time}
                                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>

                        {/* Rate preview */}
                        <div
                            className={`rounded-lg px-4 py-3 text-sm ${
                                computedRate
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'bg-yellow-500/10 border border-yellow-500/20'
                            }`}
                        >
                            {computedRate ? (
                                <p className="text-primary font-medium">
                                    💰 Rate: <span className="font-bold">{computedRate} EGP/hr</span>
                                    {form.start_time && form.end_time && form.end_time > form.start_time && (
                                        <span className="ml-2 text-white/60">
                                            → {computeHours(form.start_time, form.end_time)}h × {computedRate} ={' '}
                                            <strong>
                                                {Math.round(computeHours(form.start_time, form.end_time) * computedRate * 100) / 100} EGP
                                            </strong>
                                        </span>
                                    )}
                                </p>
                            ) : (
                                <p className="text-yellow-400">⚠ {t('noBaseRate')}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !computedRate}
                            className="btn-glossy w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? tc('saving') : t('logActivity')}
                        </button>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
