'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
                <p className="text-white/60 text-sm mt-1">{t('subtitle')}</p>
            </motion.div>

            {/* Animated Tabs */}
            <motion.div 
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {(['mark', 'summary'] as const).map((tabKey, idx) => (
                    <motion.button
                        key={tabKey}
                        onClick={() => setTab(tabKey)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === tabKey 
                                ? 'text-white' 
                                : 'text-white/70 hover:text-white/90'
                        }`}
                    >
                        {tabKey === 'mark' ? `✏️ ${t('markTab')}` : `📊 ${t('summaryTab')}`}
                        {tab === tabKey && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-primary to-primary/70 rounded-lg -z-10"
                                layoutId="activeTab"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                    </motion.button>
                ))}
            </motion.div>

            {/* Animated Filter Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <GlassCard className="p-4">
                    <div className="flex flex-wrap gap-4">
                        <motion.div className="flex-1 min-w-48"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <label className="block text-white/70 text-xs mb-1 font-medium">{tc('course')}</label>
                            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all hover:border-white/30">
                                <option value="">{t('selectCourseLabel')}</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {tab === 'mark' && (
                                <motion.div 
                                    key="session-select"
                                    className="flex-1 min-w-48"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <label className="block text-white/70 text-xs mb-1 font-medium">{t('selectSessionLabel')}</label>
                                    <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                                        disabled={!selectedCourse || loadingSessions}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-all hover:border-white/30">
                                        <option value="">{t('selectSessionLabel')}</option>
                                        {sessions.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.session_date} · {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                                            </option>
                                        ))}
                                    </select>
                                </motion.div>
                            )}

                            {tab === 'summary' && (
                                <motion.div 
                                    key="month-select"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <label className="block text-white/70 text-xs mb-1 font-medium">{t('monthLabel')}</label>
                                    <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all hover:border-white/30" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </GlassCard>
            </motion.div>

            {/* MARK TAB */}
            <AnimatePresence mode="wait">
                {tab === 'mark' && selectedCourse && selectedSession && (
                    <motion.div
                        key="mark-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <GlassCard className="p-4 space-y-4">
                            {selectedSessionData && (
                                <motion.div 
                                    className="flex items-center justify-between flex-wrap gap-3"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div>
                                        <p className="text-white font-semibold">{selectedSessionData.session_date}</p>
                                        <p className="text-white/60 text-sm">{selectedSessionData.start_time?.slice(0, 5)} – {selectedSessionData.end_time?.slice(0, 5)}</p>
                                    </div>
                                    <motion.div className="flex gap-3 text-sm flex-wrap"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        {alreadyMarked && (
                                            <motion.span 
                                                className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-semibold"
                                                whileInView={{ scale: 1.05 }}
                                            >
                                                {t('alreadyMarkedBadge')}
                                            </motion.span>
                                        )}
                                        <motion.span 
                                            className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold"
                                            whileInView={{ scale: 1.05 }}
                                        >
                                            {t('presentCount', { count: presentCount })}
                                        </motion.span>
                                        <motion.span 
                                            className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-semibold"
                                            whileInView={{ scale: 1.05 }}
                                        >
                                            {t('absentCount', { count: absentCount })}
                                        </motion.span>
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* Locked notice for coach */}
                            {alreadyMarked && (
                                <motion.div 
                                    className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <p className="text-green-400 font-semibold text-sm">{t('alreadyMarkedTitle')}</p>
                                    <p className="text-white/60 text-xs mt-0.5">{t('alreadyMarkedNote')}</p>
                                </motion.div>
                            )}

                            {!alreadyMarked && students.length > 0 && (
                                <motion.div 
                                    className="flex gap-2 flex-wrap"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <span className="text-white/60 text-sm self-center">{tc('markAll')}:</span>
                                    {(['present', 'absent', 'late'] as const).map((status, idx) => (
                                        <motion.button
                                            key={status}
                                            onClick={() => markAll(status)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + idx * 0.05 }}
                                            className={`px-3 py-1 text-sm rounded-lg transition-all font-semibold ${
                                                status === 'present'
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40'
                                                    : status === 'absent'
                                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40'
                                                    : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40'
                                            }`}
                                        >
                                            {tc(status)}
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}

                            {loadingStudents ? (
                                <motion.div 
                                    className="py-12 text-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
                                    />
                                    <p className="text-white/50 text-sm mt-3">{tc('loading')}</p>
                                </motion.div>
                            ) : students.length === 0 ? (
                                <motion.div 
                                    className="py-8 text-center text-white/50"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {t('noStudents')}
                                </motion.div>
                            ) : (
                                <div className="space-y-2">
                                    {students.map((student, idx) => {
                                        const currentStatus = pendingStatus[student.id] || 'absent';
                                        return (
                                            <motion.div
                                                key={student.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + (idx % 5) * 0.05 }}
                                                whileHover={{ x: 4 }}
                                                className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 hover:bg-white/8 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-white/40 text-sm w-6">{idx + 1}</span>
                                                    <motion.div 
                                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-sm font-semibold shadow-lg"
                                                        whileHover={{ scale: 1.15 }}
                                                    >
                                                        {student.full_name.charAt(0).toUpperCase()}
                                                    </motion.div>
                                                    <span className="text-white font-medium">{student.full_name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {(['present', 'absent', 'late'] as const).map(s => (
                                                        <motion.button
                                                            key={s}
                                                            onClick={() => !alreadyMarked && setPendingStatus(p => ({ ...p, [student.id]: s }))}
                                                            disabled={alreadyMarked}
                                                            whileHover={!alreadyMarked ? { scale: 1.1 } : {}}
                                                            whileTap={!alreadyMarked ? { scale: 0.95 } : {}}
                                                            className={`px-3 py-1 text-xs rounded-lg border font-medium transition-all ${
                                                                currentStatus === s
                                                                    ? STATUS_COLORS[s] + ' shadow-lg shadow-current/30'
                                                                    : alreadyMarked
                                                                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                                                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {tc(s)}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {students.length > 0 && !alreadyMarked && (
                                <motion.div 
                                    className="flex justify-end pt-4"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <motion.button
                                        onClick={handleSave}
                                        disabled={saving}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg shadow-primary/50 text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <span className="flex items-center gap-2">
                                                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                                {tc('saving')}
                                            </span>
                                        ) : (
                                            t('saveAttendance')
                                        )}
                                    </motion.button>
                                </motion.div>
                            )}
                        </GlassCard>
                    </motion.div>
                )}

                {tab === 'mark' && selectedCourse && !selectedSession && (
                    <motion.div
                        key="select-session"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <GlassCard className="p-12 text-center">
                            <p className="text-white/50">{t('selectBoth')}</p>
                        </GlassCard>
                    </motion.div>
                )}
                {!selectedCourse && (
                    <motion.div
                        key="select-course"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <GlassCard className="p-12 text-center">
                            <p className="text-white/50">{t('selectCourseFirst')}</p>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SUMMARY TAB */}
            <AnimatePresence mode="wait">
                {tab === 'summary' && (
                    <motion.div
                        key="summary-content"
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {!selectedCourse ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <GlassCard className="p-12 text-center">
                                    <p className="text-white/50">{t('selectCourseFirst')}</p>
                                </GlassCard>
                            </motion.div>
                        ) : summaryData.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <GlassCard className="p-12 text-center">
                                    <p className="text-white/50">{t('summaryNoData')}</p>
                                </GlassCard>
                            </motion.div>
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
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
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
                                                <tbody>{summaryData.map((row: any, idx: number) => (
                                                    <motion.tr
                                                        key={row.student_id}
                                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.1 + (idx % 5) * 0.03 }}
                                                        whileHover={{ x: 2 }}
                                                    >
                                                        <td className="py-3 px-3 text-white font-medium">{row.student_name}</td>
                                                        <td className="py-3 px-3 text-center text-white/80">{row.total_sessions}</td>
                                                        <td className="py-3 px-3 text-center text-green-400 font-semibold">{row.sessions_attended}</td>
                                                        <td className="py-3 px-3 text-center text-red-400 font-semibold">{row.sessions_absent}</td>
                                                        <td className="py-3 px-3 text-center text-yellow-400 font-semibold">{row.sessions_late ?? 0}</td>
                                                        <td className="py-3 px-3 text-center">
                                                            <motion.span 
                                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${Number(row.attendance_percentage) >= 80 ? 'bg-green-500/20 text-green-400' : Number(row.attendance_percentage) >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}
                                                                whileHover={{ scale: 1.1 }}
                                                            >
                                                                {row.attendance_percentage}%
                                                            </motion.span>
                                                        </td>
                                                    </motion.tr>
                                                ))}</tbody>
                                            </table>
                                        </GlassCard>
                                    </motion.div>

                                    {/* Session detail pivot */}
                                    {dates.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <GlassCard className="p-4">
                                                <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                                                    <span>{t('sessionDetailTitle')}</span>
                                                    <motion.span
                                                        animate={{ opacity: [0.5, 1] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        className="w-2 h-2 rounded-full bg-primary"
                                                    />
                                                </h3>
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
                                                    {summaryData.map((row: any, idx: number) => (
                                                        <motion.tr
                                                            key={row.student_id}
                                                            className="border-t border-white/5"
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: 0.2 + (idx % 5) * 0.03 }}
                                                        >
                                                            <td className="py-2 px-3 text-white font-medium sticky left-0 bg-transparent whitespace-nowrap">{row.student_name}</td>
                                                            {dates.map(d => {
                                                                const status = pivot[row.student_id]?.[d];
                                                                return (
                                                                    <td key={d} className="py-2 px-2 text-center">
                                                                        {status ? (
                                                                            <motion.span
                                                                                className={`inline-block w-7 h-7 leading-7 rounded-full text-xs font-bold ${STATUS_PILL[status]}`}
                                                                                whileHover={{ scale: 1.2 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                            >
                                                                                {STATUS_SHORT[status]}
                                                                            </motion.span>
                                                                        ) : (
                                                                            <span className="text-white/20 text-xs">{t('noRecord')}</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <motion.div
                                                            className="flex gap-4 mt-4 pt-4 border-t border-white/10 flex-wrap"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.3 }}
                                                        >
                                                            {[
                                                                { icon: t('presentShort'), label: tc('present'), color: 'bg-green-500/20 text-green-400' },
                                                                { icon: t('absentShort'), label: tc('absent'), color: 'bg-red-500/20 text-red-400' },
                                                                { icon: t('lateShort'), label: tc('late'), color: 'bg-yellow-500/20 text-yellow-400' },
                                                            ].map((item, idx) => (
                                                                <motion.span
                                                                    key={idx}
                                                                    className="flex items-center gap-1.5 text-xs text-white/50"
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: 0.3 + idx * 0.05 }}
                                                                >
                                                                    <motion.span
                                                                        className={`inline-block w-5 h-5 leading-5 rounded-full font-bold text-center text-xs ${item.color}`}
                                                                        whileHover={{ scale: 1.2 }}
                                                                    >
                                                                        {item.icon}
                                                                    </motion.span>
                                                                    {item.label}
                                                                </motion.span>
                                                            ))}
                                                        </motion.div>
                                                    </GlassCard>
                                                </motion.div>
                                            )}
                            </>
                        );
                    })()}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}
