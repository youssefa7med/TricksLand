'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LuxuryLoader } from '@/components/ui/LuxuryLoader';

export default function AdminCoachProfilePage() {
    const params = useParams();
    const locale = useLocale();
    const t = useTranslations('pages.coaches.profile');
    const tc = useTranslations('common');
    const coachId = params.id as string;
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [coach, setCoach] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [allTimeSessions, setAllTimeSessions] = useState<any[]>([]);
    const [rates, setRates] = useState<any[]>([]);
    const [editingRate, setEditingRate] = useState(false);
    const [editingBio, setEditingBio] = useState(false);
    const [bioValue, setBioValue] = useState('');
    const [rateForm, setRateForm] = useState({
        base_hourly_rate: '',
        rate_effective_from: '',
        next_rate_increase_date: '',
    });

    useEffect(() => { loadCoachData(); }, [coachId]);

    const loadCoachData = async () => {
        setLoading(true);
        try {
            const { data: coachData, error: coachError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', coachId)
                .eq('role', 'coach')
                .single();

            if (coachError) throw coachError;
            setCoach(coachData);
            setBioValue((coachData as any).bio || '');

            const [{ data: coursesData }, { data: allSessionsData }, { data: ratesData }] = await Promise.all([
                supabase.from('course_coaches').select('courses (id, name, status, hourly_rate)').eq('coach_id', coachId),
                supabase.from('sessions').select('id, session_date, start_time, end_time, computed_hours, applied_rate, subtotal, courses (name)').eq('paid_coach_id', coachId).order('session_date', { ascending: false }),
                supabase.from('hourly_rates').select('id, course_id, rate, effective_from, courses (name)').eq('coach_id', coachId).order('effective_from', { ascending: false }).limit(20),
            ]);

            setCourses((coursesData || []).map((cc: any) => cc.courses).filter(Boolean));
            setAllTimeSessions(allSessionsData || []);
            // Recent 30 days for the sessions table
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            setSessions((allSessionsData || []).filter((s: any) => s.session_date >= thirtyDaysAgo.toISOString().split('T')[0]).slice(0, 50));
            setRates(ratesData || []);

            if (coachData) {
                setRateForm({
                    base_hourly_rate: (coachData as any).base_hourly_rate || '',
                    rate_effective_from: (coachData as any).rate_effective_from || '',
                    next_rate_increase_date: (coachData as any).next_rate_increase_date || '',
                });
            }
        } catch (error: any) {
            toast.error(error.message || t('failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRate = async () => {
        const baseRate = parseFloat(rateForm.base_hourly_rate);
        if (isNaN(baseRate) || baseRate <= 0) { toast.error(t('invalidBaseRate')); return; }

        const effectiveFrom = rateForm.rate_effective_from || new Date().toISOString().split('T')[0];
        // Auto-derive: if admin didn't set a next increase date, schedule it 1 year after effective_from
        let nextIncreaseDate = rateForm.next_rate_increase_date || null;
        if (!nextIncreaseDate) {
            const d = new Date(effectiveFrom);
            d.setFullYear(d.getFullYear() + 1);
            nextIncreaseDate = d.toISOString().split('T')[0];
        }

        // Use the API route (service role) so RLS doesn't block updating another user's profile
        // Validate: next increase date must be in the future and after effective date
        if (nextIncreaseDate) {
            const today = new Date(new Date().toDateString());
            const increaseDate = new Date(nextIncreaseDate);
            const effectiveDateObj = new Date(effectiveFrom);
            if (increaseDate <= today) {
                toast.error(t('increaseDateMustBeFuture'));
                return;
            }
            if (increaseDate <= effectiveDateObj) {
                toast.error(t('increaseDateMustBeAfterEffective'));
                return;
            }
        }

        const res = await fetch(`/api/admin/coaches/${coachId}/rate`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base_hourly_rate: baseRate,
                rate_effective_from: effectiveFrom,
                next_rate_increase_date: nextIncreaseDate,
            }),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error || t('failedToUpdateRate')); }
        else { toast.success(t('rateUpdated')); setEditingRate(false); loadCoachData(); }
    };

    const handleUpdateBio = async () => {
        const { error } = await (supabase as any).from('profiles').update({ bio: bioValue }).eq('id', coachId);
        if (error) { toast.error(error.message); }
        else { toast.success(t('bioUpdated')); setEditingBio(false); loadCoachData(); }
    };

    const calculateCurrentRate = () => {
        if (!coach?.base_hourly_rate || !coach?.rate_effective_from) return null;
        const baseRate = Number(coach.base_hourly_rate);
        const yearsPassed = Math.floor((Date.now() - new Date(coach.rate_effective_from).getTime()) / (1000 * 60 * 60 * 24 * 365));
        let rate = baseRate;
        for (let i = 0; i < yearsPassed; i++) rate *= 1.25;
        return Math.round(rate * 100) / 100;
    };

    const allTimeStats = {
        totalSessions: allTimeSessions.length,
        totalHours: allTimeSessions.reduce((s, x) => s + (x.computed_hours || 0), 0),
        totalEarnings: allTimeSessions.reduce((s, x) => s + (x.subtotal || 0), 0),
    };

    const recentStats = {
        totalSessions: sessions.length,
        totalHours: sessions.reduce((s, x) => s + (x.computed_hours || 0), 0),
        totalEarnings: sessions.reduce((s, x) => s + (x.subtotal || 0), 0),
    };

    const currentRate = calculateCurrentRate();

    const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    const inputClass = 'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary';

    if (loading) return <div className="page-container flex items-center justify-center"><LuxuryLoader /></div>;
    if (!coach) return <div className="page-container"><p className="text-white/70">{t('coachNotFound')}</p><Link href={`/${locale}/admin/coaches`} className="text-primary">{t('backToCoaches')}</Link></div>;

    return (
        <div className="page-container">
            <div className="max-w-6xl mx-auto">
                <Link href={`/${locale}/admin/coaches`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    {t('backToCoaches')}
                </Link>

                {/* Profile Header */}
                <GlassCard className="mb-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-2xl bg-primary/30 flex items-center justify-center text-white text-2xl font-bold shrink-0 border border-primary/40">
                            {getInitials(coach.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-white">{coach.full_name}</h1>
                                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium border border-primary/30">{tc('coach')}</span>
                            </div>
                            <p className="text-white/60 text-sm mb-2">{coach.email}</p>
                            {coach.created_at && (
                                <p className="text-white/40 text-xs">{t('memberSince')} {formatDate(coach.created_at)}</p>
                            )}
                            {/* Bio */}
                            {!editingBio ? (
                                <div className="mt-3">
                                    <p className="text-white/70 text-sm leading-relaxed">{coach.bio || <span className="italic text-white/40">{t('noBioYet')}</span>}</p>
                                    <button onClick={() => setEditingBio(true)} className="text-primary text-xs mt-2 hover:underline">{t('editBio')}</button>
                                </div>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    <textarea
                                        value={bioValue}
                                        onChange={(e) => setBioValue(e.target.value)}
                                        rows={3}
                                        placeholder={t('bioPlaceholder')}
                                        className={`${inputClass} resize-none`}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateBio} className="btn-glossy text-sm">{t('saveBio')}</button>
                                        <button onClick={() => setEditingBio(false)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white text-sm transition-colors">{tc('cancel')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* All-Time Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <GlassCard>
                        <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{t('allTimeSessions')}</p>
                        <p className="text-3xl font-bold text-white">{allTimeStats.totalSessions}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{t('allTimeHours')}</p>
                        <p className="text-3xl font-bold text-white">{allTimeStats.totalHours.toFixed(1)}h</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{t('allTimeEarnings')}</p>
                        <p className="text-3xl font-bold text-green-400">{formatCurrency(allTimeStats.totalEarnings)}</p>
                    </GlassCard>
                </div>
                {/* Last 30 Days Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <GlassCard>
                        <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{t('sessions30d')}</p>
                        <p className="text-2xl font-bold text-white">{recentStats.totalSessions}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{t('hours30d')}</p>
                        <p className="text-2xl font-bold text-white">{recentStats.totalHours.toFixed(1)}h</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{t('earnings30d')}</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(recentStats.totalEarnings)}</p>
                    </GlassCard>
                </div>

                {/* Base Rate */}
                <GlassCard className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">{t('baseHourlyRate')}</h2>
                            {coach.base_hourly_rate ? (
                                <div className="space-y-1">
                                    <p className="text-white/80">
                                        {t('baseLabel')} <span className="font-bold text-white text-lg">{formatCurrency(coach.base_hourly_rate)}</span>
                                        <span className="text-white/40 text-sm ml-2">/hr</span>
                                    </p>
                                    {currentRate && currentRate !== Number(coach.base_hourly_rate) && (
                                        <p className="text-green-400 font-semibold">
                                            {t('currentRateWithIncreases')} {formatCurrency(currentRate)}/hr
                                        </p>
                                    )}
                                    {coach.rate_effective_from && (
                                        <p className="text-white/50 text-sm">{t('effectiveFrom')} {formatDate(coach.rate_effective_from)}</p>
                                    )}
                                    {coach.next_rate_increase_date && (() => {
                                        const isOverdue = new Date(coach.next_rate_increase_date) < new Date(new Date().toDateString());
                                        return isOverdue ? (
                                            <p className="text-red-400 text-sm font-semibold">
                                                {t('overdueIncrease')} {formatDate(coach.next_rate_increase_date)} — {t('overdueIncreaseNote')}
                                            </p>
                                        ) : (
                                            <p className="text-yellow-400 text-sm">{t('nextIncrease')} {formatDate(coach.next_rate_increase_date)}</p>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <p className="text-white/60">{t('noBaseRateSet')}</p>
                            )}
                        </div>
                        <button onClick={() => setEditingRate(!editingRate)} className="btn-glossy text-sm">
                            {editingRate ? tc('cancel') : t('editRate')}
                        </button>
                    </div>

                    {editingRate && (
                        <div className="border-t border-white/10 pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">{t('baseRateInput')}</label>
                                    <input type="number" step="0.01" min="0.01" value={rateForm.base_hourly_rate}
                                        onChange={(e) => setRateForm({ ...rateForm, base_hourly_rate: e.target.value })}
                                        className={inputClass} placeholder="80.00" />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">{t('effectiveFromLabel')}</label>
                                    <input type="date" value={rateForm.rate_effective_from}
                                        onChange={(e) => setRateForm({ ...rateForm, rate_effective_from: e.target.value })}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">{t('nextIncreaseDateLabel')}</label>
                                    <input type="date" value={rateForm.next_rate_increase_date}
                                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                        onChange={(e) => setRateForm({ ...rateForm, next_rate_increase_date: e.target.value })}
                                        className={inputClass} />
                                    <p className="text-white/40 text-xs mt-1">{t('nextIncreaseDateHint')}</p>
                                </div>
                            </div>
                            <button onClick={handleUpdateRate} className="btn-glossy">{t('saveRate')}</button>
                        </div>
                    )}
                </GlassCard>

                {/* Assigned Courses */}
                <GlassCard className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">{t('assignedCourses')}</h2>
                    {courses.length === 0 ? (
                        <p className="text-white/60">{t('noCoursesAssigned')}</p>
                    ) : (
                        <div className="space-y-2">
                            {courses.map((course: any) => (
                                <div key={course.id} className="flex justify-between items-center py-2 border-b border-white/5">
                                    <div>
                                        <p className="text-white font-medium">{course.name}</p>
                                        <p className="text-white/60 text-sm">
                                            {course.status}
                                            {course.hourly_rate && ` · ${t('defaultRate')} ${formatCurrency(course.hourly_rate)}/hr`}
                                        </p>
                                    </div>
                                    <Link href={`/${locale}/admin/courses/${course.id}`} className="text-primary hover:text-white text-sm">{t('viewCourse')}</Link>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>

                {/* Rate History */}
                <GlassCard className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">{t('courseSpecificRates')}</h2>
                    {rates.length === 0 ? (
                        <p className="text-white/60">{t('noRatesSet')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-white/60">{t('courseCol')}</th>
                                        <th className="text-left py-2 px-3 text-white/60">{t('rateCol')}</th>
                                        <th className="text-left py-2 px-3 text-white/60">{t('effectiveFromCol')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rates.map((rate: any) => (
                                        <tr key={rate.id} className="border-b border-white/5">
                                            <td className="py-2 px-3 text-white">{(rate.courses as any)?.name || '—'}</td>
                                            <td className="py-2 px-3 text-white font-semibold">{formatCurrency(rate.rate)}/hr</td>
                                            <td className="py-2 px-3 text-white/70">{formatDate(rate.effective_from)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>

                {/* Recent Sessions */}
                <GlassCard>
                    <h2 className="text-xl font-semibold text-white mb-4">{t('recentSessions')}</h2>
                    {sessions.length === 0 ? (
                        <p className="text-white/60">{t('noSessionsRecent')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-white/60">{t('dateCol')}</th>
                                        <th className="text-left py-2 px-3 text-white/60">{t('courseCol')}</th>
                                        <th className="text-left py-2 px-3 text-white/60">{t('hoursCol')}</th>
                                        <th className="text-left py-2 px-3 text-white/60">{t('rateCol')}</th>
                                        <th className="text-right py-2 px-3 text-white/60">{t('amountCol')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session: any) => (
                                        <tr key={session.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-2 px-3 text-white">{formatDate(session.session_date)}</td>
                                            <td className="py-2 px-3 text-white">{(session.courses as any)?.name || '—'}</td>
                                            <td className="py-2 px-3 text-white/80">{session.computed_hours}h</td>
                                            <td className="py-2 px-3 text-white/80">
                                                {session.applied_rate ? formatCurrency(session.applied_rate) : <span className="text-red-400 text-xs">{t('noRate')}</span>}
                                            </td>
                                            <td className="py-2 px-3 text-right font-semibold text-white">
                                                {session.subtotal ? formatCurrency(session.subtotal) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
