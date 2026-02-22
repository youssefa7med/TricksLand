'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Course { id: string; name: string; }
interface Session { id: string; session_date: string; start_time: string; end_time: string; }
interface Student { id: string; full_name: string; }

const STATUS_COLORS = {
    present: 'bg-green-500/20 text-green-400 border-green-500/40',
    absent: 'bg-red-500/20 text-red-400 border-red-500/40',
    late: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
};

export default function CoachStudentAttendancePage() {
    const supabase = createClient();
    const t = useTranslations('pages.studentAttendance');
    const tc = useTranslations('common');

    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [pendingStatus, setPendingStatus] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSession, setSelectedSession] = useState('');
    const [selectedSessionData, setSelectedSessionData] = useState<Session | null>(null);
    const [tab, setTab] = useState<'mark' | 'summary'>('mark');
    const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().substring(0, 7));
    const [summaryData, setSummaryData] = useState<any[]>([]);
    const [detailRecords, setDetailRecords] = useState<any[]>([]);

    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [coachId, setCoachId] = useState('');
    // Lock form once attendance is already recorded for the session
    const [alreadyMarked, setAlreadyMarked] = useState(false);

    // Load coach's courses
    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCoachId(user.id);

            const { data } = await supabase
                .from('course_coaches')
                .select('course_id, courses!course_coaches_course_id_fkey(id, name)')
                .eq('coach_id', user.id);

            const courseList: Course[] = (data || []).map((r: any) => ({
                id: r.courses?.id || r.course_id,
                name: r.courses?.name || 'Unknown',
            }));
            setCourses(courseList);
        };
        load();
    }, []);

    // Load sessions when course changes
    useEffect(() => {
        if (!selectedCourse) { setSessions([]); return; }
        setLoadingSessions(true);
        setSelectedSession('');
        setSelectedSessionData(null);
        setStudents([]);
        setAlreadyMarked(false);
        supabase.from('sessions')
            .select('id, session_date, start_time, end_time')
            .eq('course_id', selectedCourse)
            .order('session_date', { ascending: false })
            .limit(20)
            .then(({ data }) => { setSessions(data || []); setLoadingSessions(false); });
    }, [selectedCourse]);

    // Load students + existing attendance per session
    const loadSessionData = useCallback(async (sessionId: string, courseId: string) => {
        setLoadingStudents(true);
        setAlreadyMarked(false);

        const { data: enrolled } = await (supabase as any)
            .from('course_students')
            .select('student_id, students(id, full_name)')
            .eq('course_id', courseId);

        const studentList: Student[] = (enrolled || []).map((r: any) => ({
            id: r.students?.id || r.student_id,
            full_name: r.students?.full_name || 'Unknown',
        }));
        setStudents(studentList);

        const { data: attData } = await (supabase as any)
            .from('student_attendance')
            .select('student_id, status')
            .eq('session_id', sessionId);

        const statusMap: Record<string, 'present' | 'absent' | 'late'> = {};
        (attData || []).forEach((r: any) => { statusMap[r.student_id] = r.status; });
        setPendingStatus(statusMap);
        setAlreadyMarked((attData || []).length > 0);
        setLoadingStudents(false);
    }, [supabase]);

    useEffect(() => {
        if (!selectedSession || !selectedCourse) return;
        const sess = sessions.find(s => s.id === selectedSession) || null;
        setSelectedSessionData(sess);
        loadSessionData(selectedSession, selectedCourse);
    }, [selectedSession, selectedCourse, sessions, loadSessionData]);

    // Load summary
    useEffect(() => {
        if (tab !== 'summary' || !selectedCourse) return;
        const [y, m] = summaryMonth.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const monthStart = `${summaryMonth}-01`;
        const monthEnd = `${summaryMonth}-${String(lastDay).padStart(2, '0')}`;
        Promise.all([
            (supabase as any)
                .from('student_monthly_attendance')
                .select('*')
                .eq('course_id', selectedCourse)
                .eq('month', summaryMonth)
                .order('student_name'),
            (supabase as any)
                .from('student_attendance')
                .select('student_id, attendance_date, status, students(full_name)')
                .eq('course_id', selectedCourse)
                .gte('attendance_date', monthStart)
                .lte('attendance_date', monthEnd)
                .order('attendance_date'),
        ]).then(([{ data: sumData }, { data: rawData }]) => {
            setSummaryData(sumData || []);
            setDetailRecords(rawData || []);
        });
    }, [tab, selectedCourse, summaryMonth]);

    const handleSave = async () => {
        if (!selectedSession || !selectedCourse || students.length === 0) return;
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error('Not authenticated'); setSaving(false); return; }

        const session = sessions.find(s => s.id === selectedSession);
        if (!session) { setSaving(false); return; }

        let ok = 0, fail = 0;
        for (const student of students) {
            const status = pendingStatus[student.id] || 'absent';
            const { error } = await (supabase as any).from('student_attendance').upsert({
                session_id: selectedSession,
                student_id: student.id,
                course_id: selectedCourse,
                attendance_date: session.session_date,
                status,
                marked_by: user.id,
                marked_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'session_id,student_id' });
            if (error) fail++; else ok++;
        }
        setSaving(false);
        if (fail === 0) toast.success(t('savedMsg', { count: ok }));
        else toast.warning(`${ok} saved, ${fail} failed`);
        loadSessionData(selectedSession, selectedCourse);
    };

    const markAll = (status: 'present' | 'absent' | 'late') => {
        const map: Record<string, 'present' | 'absent' | 'late'> = {};
        students.forEach(s => { map[s.id] = status; });
        setPendingStatus(map);
    };

    const presentCount = Object.values(pendingStatus).filter(s => s === 'present').length;
    const absentCount = Object.values(pendingStatus).filter(s => s === 'absent').length;

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-white/60 text-sm mt-1">{t('subtitle')}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {(['mark', 'summary'] as const).map(tabKey => (
                    <button key={tabKey} onClick={() => setTab(tabKey)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === tabKey ? 'bg-primary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                        {tabKey === 'mark' ? `✏️ ${t('markTab')}` : `📊 ${t('summaryTab')}`}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-48">
                        <label className="block text-white/70 text-xs mb-1">{tc('course')}</label>
                        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">{t('selectCourseLabel')}</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {tab === 'mark' && (
                        <div className="flex-1 min-w-48">
                            <label className="block text-white/70 text-xs mb-1">{t('selectSessionLabel')}</label>
                            <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                                disabled={!selectedCourse || loadingSessions}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
                                <option value="">{t('selectSessionLabel')}</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.session_date} · {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {tab === 'summary' && (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{t('monthLabel')}</label>
                            <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* MARK TAB */}
            {tab === 'mark' && selectedCourse && selectedSession && (
                <GlassCard className="p-4 space-y-4">
                    {selectedSessionData && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <p className="text-white font-semibold">{selectedSessionData.session_date}</p>
                                <p className="text-white/60 text-sm">{selectedSessionData.start_time?.slice(0, 5)} – {selectedSessionData.end_time?.slice(0, 5)}</p>
                            </div>
                            <div className="flex gap-3 text-sm flex-wrap">
                                {alreadyMarked && (
                                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                                        {t('alreadyMarkedBadge')}
                                    </span>
                                )}
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full">{t('presentCount', { count: presentCount })}</span>
                                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full">{t('absentCount', { count: absentCount })}</span>
                            </div>
                        </div>
                    )}

                    {/* Locked notice for coach */}
                    {alreadyMarked && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                            <p className="text-green-400 font-semibold text-sm">{t('alreadyMarkedTitle')}</p>
                            <p className="text-white/60 text-xs mt-0.5">{t('alreadyMarkedNote')}</p>
                        </div>
                    )}

                    {!alreadyMarked && students.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-white/60 text-sm self-center">{tc('markAll')}:</span>
                            <button onClick={() => markAll('present')} className="px-3 py-1 text-sm rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors">{t('markAllPresent')}</button>
                            <button onClick={() => markAll('absent')} className="px-3 py-1 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors">{t('markAllAbsent')}</button>
                            <button onClick={() => markAll('late')} className="px-3 py-1 text-sm rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 transition-colors">{t('markAllLate')}</button>
                        </div>
                    )}

                    {loadingStudents ? (
                        <div className="py-8 text-center text-white/50">{tc('loading')}…</div>
                    ) : students.length === 0 ? (
                        <div className="py-8 text-center text-white/50">{t('noStudents')}</div>
                    ) : (
                        <div className="space-y-2">
                            {students.map((student, idx) => {
                                const currentStatus = pendingStatus[student.id] || 'absent';
                                return (
                                    <div key={student.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white/40 text-sm w-6">{idx + 1}</span>
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                                                {student.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-white font-medium">{student.full_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {(['present', 'absent', 'late'] as const).map(s => (
                                                <button key={s}
                                                    onClick={() => !alreadyMarked && setPendingStatus(p => ({ ...p, [student.id]: s }))}
                                                    disabled={alreadyMarked}
                                                    className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                                                        currentStatus === s
                                                            ? STATUS_COLORS[s] + ' font-semibold'
                                                            : alreadyMarked
                                                                ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                    }`}>
                                                    {tc(s)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {students.length > 0 && !alreadyMarked && (
                        <div className="flex justify-end pt-2">
                            <button onClick={handleSave} disabled={saving}
                                className="bg-primary hover:bg-primary/80 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                                {saving ? tc('saving') : t('saveAttendance')}
                            </button>
                        </div>
                    )}
                </GlassCard>
            )}

            {tab === 'mark' && selectedCourse && !selectedSession && (
                <GlassCard className="p-8 text-center text-white/50">{t('selectBoth')}</GlassCard>
            )}
            {!selectedCourse && (
                <GlassCard className="p-8 text-center text-white/50">{t('selectCourseFirst')}</GlassCard>
            )}

            {/* SUMMARY TAB */}
            {tab === 'summary' && (
                <div className="space-y-4">
                    {!selectedCourse ? (
                        <GlassCard className="p-8 text-center text-white/50">{t('selectCourseFirst')}</GlassCard>
                    ) : summaryData.length === 0 ? (
                        <GlassCard className="p-8 text-center text-white/50">{t('summaryNoData')}</GlassCard>
                    ) : (() => {
                        const dates = [...new Set(detailRecords.map((r: any) => r.attendance_date as string))].sort();
                        const pivot: Record<string, Record<string, string>> = {};
                        detailRecords.forEach((r: any) => {
                            if (!pivot[r.student_id]) pivot[r.student_id] = {};
                            pivot[r.student_id][r.attendance_date] = r.status;
                        });
                        const STATUS_PILL: Record<string, string> = {
                            present: 'bg-green-500/20 text-green-400',
                            absent:  'bg-red-500/20 text-red-400',
                            late:    'bg-yellow-500/20 text-yellow-400',
                        };
                        const STATUS_SHORT: Record<string, string> = {
                            present: t('presentShort'),
                            absent:  t('absentShort'),
                            late:    t('lateShort'),
                        };
                        return (
                            <>
                                {/* Aggregated totals */}
                                <GlassCard className="p-4 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-white/50 border-b border-white/10">
                                            <th className="text-left py-2 px-3">{t('studentCol')}</th>
                                            <th className="text-center py-2 px-3">{t('sessionsCol')}</th>
                                            <th className="text-center py-2 px-3">{tc('present')}</th>
                                            <th className="text-center py-2 px-3">{tc('absent')}</th>
                                            <th className="text-center py-2 px-3">{tc('late')}</th>
                                            <th className="text-center py-2 px-3">{t('rateCol')}</th>
                                        </tr></thead>
                                        <tbody>{summaryData.map((row: any) => (
                                            <tr key={row.student_id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-3 px-3 text-white font-medium">{row.student_name}</td>
                                                <td className="py-3 px-3 text-center text-white/80">{row.total_sessions}</td>
                                                <td className="py-3 px-3 text-center text-green-400">{row.sessions_attended}</td>
                                                <td className="py-3 px-3 text-center text-red-400">{row.sessions_absent}</td>
                                                <td className="py-3 px-3 text-center text-yellow-400">{row.sessions_late ?? 0}</td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number(row.attendance_percentage) >= 80 ? 'bg-green-500/20 text-green-400' : Number(row.attendance_percentage) >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {row.attendance_percentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </GlassCard>

                                {/* Session detail pivot */}
                                {dates.length > 0 && (
                                    <GlassCard className="p-4">
                                        <h3 className="text-white font-semibold mb-3 text-sm">{t('sessionDetailTitle')}</h3>
                                        <div className="overflow-x-auto">
                                            <table className="text-xs border-separate border-spacing-0">
                                                <thead>
                                                    <tr>
                                                        <th className="text-left py-2 px-3 text-white/50 sticky left-0 bg-transparent min-w-36">{t('studentColHeader')}</th>
                                                        {dates.map(d => (
                                                            <th key={d} className="py-2 px-2 text-white/50 text-center min-w-16 whitespace-nowrap">
                                                                {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {summaryData.map((row: any) => (
                                                        <tr key={row.student_id} className="border-t border-white/5">
                                                            <td className="py-2 px-3 text-white font-medium sticky left-0 bg-transparent whitespace-nowrap">{row.student_name}</td>
                                                            {dates.map(d => {
                                                                const status = pivot[row.student_id]?.[d];
                                                                return (
                                                                    <td key={d} className="py-2 px-2 text-center">
                                                                        {status ? (
                                                                            <span className={`inline-block w-7 h-7 leading-7 rounded-full text-xs font-bold ${STATUS_PILL[status]}`}>
                                                                                {STATUS_SHORT[status]}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-white/20">{t('noRecord')}</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 flex-wrap">
                                            <span className="flex items-center gap-1.5 text-xs text-white/50">
                                                <span className="inline-block w-5 h-5 leading-5 rounded-full bg-green-500/20 text-green-400 font-bold text-center">{t('presentShort')}</span>
                                                {tc('present')}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-white/50">
                                                <span className="inline-block w-5 h-5 leading-5 rounded-full bg-red-500/20 text-red-400 font-bold text-center">{t('absentShort')}</span>
                                                {tc('absent')}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-white/50">
                                                <span className="inline-block w-5 h-5 leading-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-center">{t('lateShort')}</span>
                                                {tc('late')}
                                            </span>
                                        </div>
                                    </GlassCard>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
