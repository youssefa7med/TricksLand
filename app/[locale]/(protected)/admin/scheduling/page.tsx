'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Course { id: string; name: string; }
interface Schedule {
    id: string;
    course_id: string;
    course_name?: string;
    total_sessions: number;
    sessions_per_week: number;
    start_date: string;
    scheduled_end_date: string;
    actual_end_date: string | null;
    sessions_completed: number;
    sessions_cancelled: number;
    sessions_postponed: number;
    extra_sessions_added: number;
    status: 'active' | 'completed' | 'archived';
}

function calcEndDate(startDate: string, totalSessions: number, sessionsPerWeek: number): string {
    if (!startDate || !totalSessions || !sessionsPerWeek) return '';
    const weeksNeeded = Math.ceil(totalSessions / sessionsPerWeek);
    const start = new Date(startDate);
    start.setDate(start.getDate() + weeksNeeded * 7);
    return start.toISOString().split('T')[0];
}

const inputCls = 'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-white/40';
const labelCls = 'block text-white/70 text-xs font-medium mb-1';

export default function AdminSchedulingPage() {
    const supabase = createClient();
    const t = useTranslations('pages.scheduling');
    const tc = useTranslations('common');

    const [courses, setCourses] = useState<Course[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Form state
    const [selectedCourse, setSelectedCourse] = useState('');
    const [totalSessions, setTotalSessions] = useState('20');
    const [sessionsPerWeek, setSessionsPerWeek] = useState('3');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [overrideEndDate, setOverrideEndDate] = useState('');

    const calculatedEnd = calcEndDate(startDate, Number(totalSessions), Number(sessionsPerWeek));
    const finalEndDate = overrideEndDate || calculatedEnd;

    const loadData = async () => {
        setLoading(true);
        const [{ data: coursesData }, { data: schedulesData }] = await Promise.all([
            supabase.from('courses').select('id, name').eq('status', 'active').order('name'),
            (supabase as any)
                .from('course_schedules')
                .select('*, courses(name)')
                .order('created_at', { ascending: false }),
        ]);
        setCourses(coursesData || []);
        const mapped = (schedulesData || []).map((s: any) => ({
            ...s,
            course_name: s.courses?.name || '—',
        }));
        setSchedules(mapped);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const resetForm = () => {
        setSelectedCourse(''); setTotalSessions('20'); setSessionsPerWeek('3');
        setStartDate(new Date().toISOString().split('T')[0]); setOverrideEndDate('');
        setEditId(null); setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) { toast.error('Select a course'); return; }
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const payload = {
            course_id: selectedCourse,
            total_sessions: Number(totalSessions),
            sessions_per_week: Number(sessionsPerWeek),
            start_date: startDate,
            scheduled_end_date: finalEndDate,
            created_by: user.id,
            updated_at: new Date().toISOString(),
        };

        let error: any;
        if (editId) {
            ({ error } = await (supabase as any).from('course_schedules').update(payload).eq('id', editId));
        } else {
            ({ error } = await (supabase as any).from('course_schedules').insert(payload));
        }

        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Schedule updated' : 'Schedule created');
        resetForm();
        loadData();
    };

    const startEdit = (s: Schedule) => {
        setEditId(s.id);
        setSelectedCourse(s.course_id);
        setTotalSessions(String(s.total_sessions));
        setSessionsPerWeek(String(s.sessions_per_week));
        setStartDate(s.start_date);
        setOverrideEndDate(s.actual_end_date || '');
        setShowForm(true);
    };

    const confirmIfCompleted = (schedule: Schedule, action: () => void) => {
        if (schedule.status === 'completed') {
            const ok = window.confirm(
                'This schedule is marked as completed.\nAre you sure you want to edit it?'
            );
            if (!ok) return;
        }
        action();
    };

    const updateStatus = async (id: string, status: Schedule['status']) => {
        const { error } = await (supabase as any)
            .from('course_schedules')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) toast.error(error.message);
        else { toast.success('Status updated'); loadData(); }
    };

    const updateSessionCount = async (id: string, field: string, delta: number, current: number) => {
        const newVal = Math.max(0, current + delta);
        const { error } = await (supabase as any)
            .from('course_schedules')
            .update({ [field]: newVal, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) toast.error(error.message);
        else loadData();
    };

    const STATUS_COLORS: Record<string, string> = {
        active: 'bg-green-500/20 text-green-400',
        completed: 'bg-blue-500/20 text-blue-400',
        archived: 'bg-white/10 text-white/50',
    };

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                    <p className="text-white/60 text-sm mt-1">{t('subtitle')}</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); }}
                    className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {showForm ? tc('cancel') : `+ ${t('newSchedule')}`}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <GlassCard className="p-5">
                    <h2 className="text-white font-semibold mb-4">{editId ? t('editSchedule') : t('newSchedule')}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>{tc('course')} *</label>
                            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                                className={inputCls} required>
                                <option value="">{tc('selectCourse')}</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>{t('totalSessionsLabel')} *</label>
                            <input type="number" min="1" value={totalSessions}
                                onChange={e => setTotalSessions(e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>{t('perWeekLabel')} *</label>
                            <input type="number" min="1" max="7" value={sessionsPerWeek}
                                onChange={e => setSessionsPerWeek(e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>{t('startDateLabel')} *</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>
                                Calculated End Date
                                {calculatedEnd && <span className="text-primary ml-1">→ {calculatedEnd}</span>}
                            </label>
                            <input type="date" value={overrideEndDate} onChange={e => setOverrideEndDate(e.target.value)}
                                placeholder="Override (optional)"
                                className={inputCls} />
                            <p className="text-white/40 text-xs mt-0.5">Leave empty to use auto-calculated date</p>
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={saving}
                                className="w-full bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                {saving ? tc('saving') : editId ? t('updateBtn') : t('createBtn')}
                            </button>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* Schedules list */}
            {loading ? (
                <GlassCard className="p-8 text-center text-white/50">{tc('loading')}…</GlassCard>
            ) : schedules.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-white/50">{t('noSchedules')}</p>
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {schedules.map(s => {
                        const progress = s.total_sessions > 0
                            ? Math.round((s.sessions_completed / s.total_sessions) * 100)
                            : 0;
                        const remaining = s.total_sessions - s.sessions_completed - s.sessions_cancelled + s.extra_sessions_added;

                        return (
                            <GlassCard key={s.id} className="p-5">
                                <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                                    <div>
                                        <h3 className="text-white font-semibold text-lg">{s.course_name}</h3>
                                        <p className="text-white/60 text-sm mt-0.5">
                                            {s.start_date} → {s.scheduled_end_date}
                                            {s.sessions_per_week && <span className="ml-2 text-white/40">· {s.sessions_per_week}× / {t('weekLabel')}</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                                            {s.status === 'active' ? t('statusActive') : s.status === 'completed' ? t('statusCompleted') : t('statusArchived')}
                                        </span>
                                        <button onClick={() => confirmIfCompleted(s, () => startEdit(s))}
                                            className="text-primary hover:text-white text-sm transition-colors">{tc('edit')}</button>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-white/60 mb-1">
                                        <span>{s.sessions_completed} / {s.total_sessions} sessions completed</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2">
                                        <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, progress)}%` }} />
                                    </div>
                                </div>

                                {/* Counters */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    {[
                                        { label: t('statusCompleted'), field: 'sessions_completed', value: s.sessions_completed, color: 'text-green-400', autoTracked: true },
                                        { label: t('postponed'), field: 'sessions_postponed', value: s.sessions_postponed, color: 'text-yellow-400', autoTracked: false },
                                        { label: t('cancelled'), field: 'sessions_cancelled', value: s.sessions_cancelled, color: 'text-red-400', autoTracked: false },
                                        { label: t('extra'), field: 'extra_sessions_added', value: s.extra_sessions_added, color: 'text-blue-400', autoTracked: false },
                                    ].map(item => (
                                        <div key={item.field} className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                                            <div className="text-white/50 text-xs">{item.label}</div>
                                            {item.autoTracked ? (
                                                <div className="text-white/30 text-xs mt-1 italic">auto</div>
                                            ) : (
                                                <div className="flex justify-center gap-2 mt-1">
                                                    <button
                                                        onClick={() => confirmIfCompleted(s, () => updateSessionCount(s.id, item.field, -1, item.value))}
                                                        className="text-white/40 hover:text-white text-sm w-5 h-5 rounded bg-white/10 hover:bg-white/20 transition-colors">−</button>
                                                    <button
                                                        onClick={() => confirmIfCompleted(s, () => updateSessionCount(s.id, item.field, 1, item.value))}
                                                        className="text-white/40 hover:text-white text-sm w-5 h-5 rounded bg-white/10 hover:bg-white/20 transition-colors">+</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Remaining info + status change */}
                                <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-white/10">
                                    <p className="text-white/50 text-sm">
                                        <span className="text-white font-medium">{Math.max(0, remaining)}</span> {t('remaining')}
                                    </p>
                                    <div className="flex gap-2">
                                        {(['active', 'completed', 'archived'] as const).filter(st => st !== s.status).map(st => (
                                            <button key={st} onClick={() => updateStatus(s.id, st)}
                                                className="px-3 py-1 text-xs rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors">
                                                {st === 'active' ? t('markActive') : st === 'completed' ? t('markCompleted') : t('markArchived')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
