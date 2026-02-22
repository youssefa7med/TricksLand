'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function AdminSessionsPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCoach, setFilterCoach] = useState('');
    const [filterCourse, setFilterCourse] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterType, setFilterType] = useState('');
    const locale = useLocale();
    const t = useTranslations('pages.sessions');
    const tc = useTranslations('common');
    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);

        let query = supabase
            .from('sessions')
            .select(`
                id, session_date, start_time, end_time, session_type,
                computed_hours, applied_rate, subtotal, notes,
                attendance_required, attendance_marked_by_admin,
                courses (id, name),
                paid_coach:profiles!sessions_paid_coach_id_fkey (id, full_name),
                original_coach:profiles!sessions_originally_scheduled_coach_id_fkey (full_name),
                coach_attendance (id, status, attendance_timestamp)
            `)
            .order('session_date', { ascending: false })
            .order('start_time', { ascending: false });

        if (filterCoach) query = query.eq('paid_coach_id', filterCoach);
        if (filterCourse) query = query.eq('course_id', filterCourse);
        if (filterMonth) {
            const start = `${filterMonth}-01`;
            const [y, m] = filterMonth.split('-').map(Number);
            // Get first day of next month then use lt — avoids invalid dates like Feb-31
            const nextMonthStart = new Date(y, m, 1).toISOString().split('T')[0];
            query = query.gte('session_date', start).lt('session_date', nextMonthStart);
        }
        if (filterType) query = query.eq('session_type', filterType);

        const { data, error } = await query;
        if (error) toast.error(error.message);
        else setSessions(data || []);
        setLoading(false);
    };

    useEffect(() => {
        const fetchFilters = async () => {
            const [{ data: coachData }, { data: courseData }] = await Promise.all([
                supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
                supabase.from('courses').select('id, name').order('name'),
            ]);
            setCoaches(coachData || []);
            setCourses(courseData || []);
        };
        fetchFilters();
    }, []);

    useEffect(() => { fetchData(); }, [filterCoach, filterCourse, filterMonth, filterType]);

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;
        const { error } = await supabase.from('sessions').delete().eq('id', id);
        if (error) toast.error(error.message);
        else { toast.success(t('sessionDeleted')); fetchData(); }
    };

    const handleMarkAttendance = async (sessionId: string, coachId: string) => {
        if (!confirm('Mark this session as attended by admin?')) return;
        
        // Check if attendance already exists
        const { data: existing } = await supabase
            .from('coach_attendance')
            .select('id')
            .eq('session_id', sessionId)
            .eq('coach_id', coachId)
            .maybeSingle();

        if (existing) {
            toast.error('Attendance already marked for this session');
            return;
        }

        // Create attendance record (admin override - no GPS required)
        const { error: attError } = await (supabase as any)
            .from('coach_attendance')
            .insert({
                coach_id: coachId,
                session_id: sessionId,
                latitude: 29.073694, // Academy location
                longitude: 31.112250,
                distance_from_academy: 0,
                status: 'present',
                attendance_timestamp: new Date().toISOString(),
            });

        if (attError) {
            toast.error(`Failed to mark attendance: ${attError.message}`);
            return;
        }

        // Update session to mark as admin-marked
        const { error: sessionError } = await (supabase as any)
            .from('sessions')
            .update({ attendance_marked_by_admin: true })
            .eq('id', sessionId);

        if (sessionError) {
            toast.error(`Failed to update session: ${sessionError.message}`);
        } else {
            toast.success('Attendance marked successfully');
            fetchData();
        }
    };

    const currentMonth = new Date().toISOString().substring(0, 7);

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('title')}</h1>
                        <p className="text-white/70">{t('subtitle')}</p>
                    </div>
                    <Link href={`/${locale}/admin/sessions/new`} className="btn-glossy">{t('logSession')}</Link>
                </div>

                {/* Filters */}
                <GlassCard className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select
                            value={filterCoach}
                            onChange={(e) => setFilterCoach(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="" className="bg-gray-900">{tc('allCoaches')}</option>
                            {coaches.map((c) => (
                                <option key={c.id} value={c.id} className="bg-gray-900">{c.full_name}</option>
                            ))}
                        </select>

                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="" className="bg-gray-900">{tc('allCourses')}</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                            ))}
                        </select>

                        <input
                            type="month"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="" className="bg-gray-900">{tc('allTypes')}</option>
                            <option value="online_session" className="bg-gray-900">{tc('online')}</option>
                            <option value="offline_meeting" className="bg-gray-900">{tc('offline')}</option>
                        </select>
                    </div>
                </GlassCard>

                {loading ? (
                    <GlassCard><p className="text-white/70 text-center py-12">Loading sessions...</p></GlassCard>
                ) : sessions.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-4">{t('noSessions')}</p>
                            <Link href={`/${locale}/admin/sessions/new`} className="btn-glossy inline-block">{t('logFirst')}</Link>
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-3 text-white/70">{t('date')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('coach')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('course')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('time')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('type')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('hrs')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('rate')}</th>
                                        <th className="text-right py-3 px-3 text-white/70">{t('amount')}</th>
                                        <th className="text-left py-3 px-3 text-white/70">{t('attendance')}</th>
                                        <th className="text-right py-3 px-3 text-white/70">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((s: any) => (
                                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-3 text-white text-sm">{formatDate(s.session_date)}</td>
                                            <td className="py-3 px-3 text-white text-sm">
                                                {(s.paid_coach as any)?.full_name}
                                                {(s.original_coach as any)?.full_name && (
                                                        <div className="text-xs text-yellow-400">
                                                            {t('original')} {(s.original_coach as any).full_name}
                                                        </div>
                                                    )}
                                            </td>
                                            <td className="py-3 px-3 text-white text-sm">{(s.courses as any)?.name}</td>
                                            <td className="py-3 px-3 text-white text-sm">{s.start_time}–{s.end_time}</td>
                                            <td className="py-3 px-3">
                                                <span className={`text-xs px-2 py-1 rounded ${s.session_type === 'online_session' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                                    {s.session_type === 'online_session' ? tc('online') : tc('offline')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-white text-sm">{s.computed_hours}h</td>
                                            <td className="py-3 px-3 text-white text-sm">{formatCurrency(s.applied_rate)}</td>
                                            <td className="py-3 px-3 text-white text-right font-semibold">{formatCurrency(s.subtotal)}</td>
                                            <td className="py-3 px-3">
                                                {s.attendance_required ? (
                                                    (s.coach_attendance && Array.isArray(s.coach_attendance) && s.coach_attendance.length > 0) || s.attendance_marked_by_admin ? (
                                                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                                                            {s.attendance_marked_by_admin ? t('adminMarked') : t('marked')}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleMarkAttendance(s.id, (s.paid_coach as any)?.id)}
                                                            className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors"
                                                        >
                                                            {t('markAttendance')}
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-300">{t('notRequired')}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <Link
                                                        href={`/${locale}/admin/sessions/edit/${s.id}`}
                                                        className="text-primary hover:text-white text-sm transition-colors"
                                                    >
                                                        {tc('edit')}
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(s.id)}
                                                        className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                                    >
                                                        {tc('delete')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 text-white/50 text-sm text-right">
                            {sessions.length} {sessions.length !== 1 ? t('sessionsFound') : t('sessionFound')}
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
