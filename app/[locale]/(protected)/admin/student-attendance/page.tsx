'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';

interface Course {
    id: string;
    name: string;
    status: string;
}

interface Session {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
}

interface Student {
    id: string;
    full_name: string;
}

interface AttendanceRecord {
    student_id: string;
    status: 'present' | 'absent' | 'late';
    arrival_time?: string;
    leaving_time?: string;
    notes?: string;
}

const STATUS_COLORS = {
    present: 'bg-green-500/20 text-green-400 border-green-500/40',
    absent: 'bg-red-500/20 text-red-400 border-red-500/40',
    late: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
};

const STATUS_LABELS = { present: 'Present', absent: 'Absent', late: 'Late' };

export default function AdminStudentAttendancePage() {
    const locale = useLocale();
    const t = useTranslations('pages.studentAttendance');
    const tc = useTranslations('common');
    const supabase = createClient();

    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [existingRecords, setExistingRecords] = useState<Record<string, AttendanceRecord>>({});
    const [pendingStatus, setPendingStatus] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSession, setSelectedSession] = useState('');
    const [selectedSessionData, setSelectedSessionData] = useState<Session | null>(null);
    const [tab, setTab] = useState<'mark' | 'summary'>('mark');
    const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().substring(0, 7));
    const [summaryData, setSummaryData] = useState<any[]>([]);

    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Load courses
    useEffect(() => {
        supabase.from('courses').select('id, name, status').eq('status', 'active').order('name')
            .then(({ data }) => { setCourses(data || []); setLoadingCourses(false); });
    }, []);

    // Load sessions when course changes
    useEffect(() => {
        if (!selectedCourse) { setSessions([]); return; }
        setLoadingSessions(true);
        setSelectedSession('');
        setSelectedSessionData(null);
        setStudents([]);
        supabase.from('sessions')
            .select('id, session_date, start_time, end_time')
            .eq('course_id', selectedCourse)
            .order('session_date', { ascending: false })
            .limit(30)
            .then(({ data }) => { setSessions(data || []); setLoadingSessions(false); });
    }, [selectedCourse]);

    // Load students + existing attendance when session changes
    const loadSessionData = useCallback(async (sessionId: string, courseId: string) => {
        if (!sessionId || !courseId) return;
        setLoadingStudents(true);

        // Get enrolled students
        const { data: enrolledData } = await (supabase as any)
            .from('course_students')
            .select('student_id, students(id, full_name)')
            .eq('course_id', courseId);

        const studentList: Student[] = (enrolledData || []).map((r: any) => ({
            id: r.students?.id || r.student_id,
            full_name: r.students?.full_name || 'Unknown',
        }));
        setStudents(studentList);

        // Get existing attendance records for this session
        const { data: attData } = await (supabase as any)
            .from('student_attendance')
            .select('student_id, status, arrival_time, leaving_time, notes')
            .eq('session_id', sessionId);

        const recordMap: Record<string, AttendanceRecord> = {};
        const statusMap: Record<string, 'present' | 'absent' | 'late'> = {};
        (attData || []).forEach((r: AttendanceRecord) => {
            recordMap[r.student_id] = r;
            statusMap[r.student_id] = r.status;
        });
        setExistingRecords(recordMap);
        setPendingStatus(statusMap);
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
        setLoadingSummary(true);
        (supabase as any)
            .from('student_monthly_attendance')
            .select('*')
            .eq('course_id', selectedCourse)
            .eq('month', summaryMonth)
            .order('student_name')
            .then(({ data }: any) => { setSummaryData(data || []); setLoadingSummary(false); });
    }, [tab, selectedCourse, summaryMonth]);

    const setStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
        setPendingStatus(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSaveAttendance = async () => {
        if (!selectedSession || !selectedCourse || students.length === 0) return;
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error('Not authenticated'); setSaving(false); return; }

        const session = sessions.find(s => s.id === selectedSession);
        if (!session) { setSaving(false); return; }

        let successCount = 0;
        let errorCount = 0;

        for (const student of students) {
            const status = pendingStatus[student.id] || 'absent';
            const { error } = await (supabase as any)
                .from('student_attendance')
                .upsert({
                    session_id: selectedSession,
                    student_id: student.id,
                    course_id: selectedCourse,
                    attendance_date: session.session_date,
                    status,
                    marked_by: user.id,
                    marked_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'session_id,student_id' });

            if (error) errorCount++;
            else successCount++;
        }

        setSaving(false);
        if (errorCount === 0) toast.success(`Attendance saved for ${successCount} students`);
        else toast.warning(`Saved ${successCount}, failed ${errorCount}`);
        loadSessionData(selectedSession, selectedCourse);
    };

    const markAll = (status: 'present' | 'absent' | 'late') => {
        const map: Record<string, 'present' | 'absent' | 'late'> = {};
        students.forEach(s => { map[s.id] = status; });
        setPendingStatus(map);
    };

    const presentCount = Object.values(pendingStatus).filter(s => s === 'present').length;
    const absentCount = Object.values(pendingStatus).filter(s => s === 'absent').length;
    const lateCount = Object.values(pendingStatus).filter(s => s === 'late').length;

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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === tabKey ? 'bg-primary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                        {tabKey === 'mark' ? t('markTab') : t('summaryTab')}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-48">
                        <label className="block text-white/70 text-xs mb-1">{t('selectCourseLabel')}</label>
                        <select
                            value={selectedCourse}
                            onChange={e => setSelectedCourse(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">{tc('selectCourse')}</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {tab === 'mark' && (
                        <div className="flex-1 min-w-48">
                            <label className="block text-white/70 text-xs mb-1">{t('selectSessionLabel')}</label>
                            <select
                                value={selectedSession}
                                onChange={e => setSelectedSession(e.target.value)}
                                disabled={!selectedCourse || loadingSessions}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            >
                                <option value="">{tc('selectSession')}</option>
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
                            <input
                                type="month"
                                value={summaryMonth}
                                onChange={e => setSummaryMonth(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* MARK ATTENDANCE TAB */}
            {tab === 'mark' && (
                <>
                    {!selectedCourse && (
                        <GlassCard className="p-8 text-center text-white/50">
                            Select a course to begin
                        </GlassCard>
                    )}
                    {selectedCourse && !selectedSession && (
                        <GlassCard className="p-8 text-center text-white/50">
                            Select a session to mark attendance
                        </GlassCard>
                    )}
                    {selectedCourse && selectedSession && (
                        <GlassCard className="p-4 space-y-4">
                            {/* Session info */}
                            {selectedSessionData && (
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div>
                                        <p className="text-white font-semibold">{selectedSessionData.session_date}</p>
                                        <p className="text-white/60 text-sm">{selectedSessionData.start_time?.slice(0, 5)} – {selectedSessionData.end_time?.slice(0, 5)}</p>
                                    </div>
                                    {/* Stats */}
                                    <div className="flex gap-3 text-sm">
                                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full">{presentCount} {t('presentCount')}</span>
                                        <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full">{absentCount} {t('absentCount')}</span>
                                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">{lateCount} {t('lateCount')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Quick mark all */}
                            {students.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    <span className="text-white/60 text-sm self-center">{tc('markAll')}:</span>
                                    <button onClick={() => markAll('present')} className="px-3 py-1 text-sm rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors">{t('markAllPresent')}</button>
                                    <button onClick={() => markAll('absent')} className="px-3 py-1 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors">{t('markAllAbsent')}</button>
                                    <button onClick={() => markAll('late')} className="px-3 py-1 text-sm rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 transition-colors">{t('markAllLate')}</button>
                                </div>
                            )}

                            {/* Students list */}
                            {loadingStudents ? (
                                <div className="py-8 text-center text-white/50">{tc('loading')}</div>
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
                                                        <button
                                                            key={s}
                                                            onClick={() => setStatus(student.id, s)}
                                                            className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                                                                currentStatus === s
                                                                    ? STATUS_COLORS[s] + ' font-semibold'
                                                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {s === 'present' ? tc('present') : s === 'absent' ? tc('absent') : tc('late')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {students.length > 0 && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSaveAttendance}
                                        disabled={saving}
                                        className="bg-primary hover:bg-primary/80 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? tc('saving') : t('saveAttendance')}
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    )}
                </>
            )}

            {/* SUMMARY TAB */}
            {tab === 'summary' && (
                <GlassCard className="p-4">
                    {!selectedCourse ? (
                        <div className="py-8 text-center text-white/50">Select a course to view summary</div>
                    ) : loadingSummary ? (
                        <div className="py-8 text-center text-white/50">Loading…</div>
                    ) : summaryData.length === 0 ? (
                        <div className="py-8 text-center text-white/50">No attendance data for {summaryMonth}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-white/50 border-b border-white/10">
                                        <th className="text-left py-2 px-3">{t('studentCol')}</th>
                                        <th className="text-center py-2 px-3">{t('sessionsCol')}</th>
                                        <th className="text-center py-2 px-3">{t('attendedCol')}</th>
                                        <th className="text-center py-2 px-3">{t('absentCol')}</th>
                                        <th className="text-center py-2 px-3">{t('lateCol')}</th>
                                        <th className="text-center py-2 px-3">{t('rateCol')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryData.map((row: any) => (
                                        <tr key={row.student_id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-3 text-white font-medium">{row.student_name}</td>
                                            <td className="py-3 px-3 text-center text-white/80">{row.total_sessions}</td>
                                            <td className="py-3 px-3 text-center text-green-400">{row.sessions_attended}</td>
                                            <td className="py-3 px-3 text-center text-red-400">{row.sessions_absent}</td>
                                            <td className="py-3 px-3 text-center text-yellow-400">{row.sessions_late}</td>
                                            <td className="py-3 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    Number(row.attendance_percentage) >= 80
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : Number(row.attendance_percentage) >= 60
                                                            ? 'bg-yellow-500/20 text-yellow-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {row.attendance_percentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            )}
        </div>
    );
}
