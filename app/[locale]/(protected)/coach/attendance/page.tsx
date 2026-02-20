'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { GlassCard } from '@/components/layout/GlassCard';
import { AttendanceMarker } from '@/components/attendance/AttendanceMarker';

interface Session {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    session_type: string;
    courses: { name: string } | null;
}

interface AttendanceRecord {
    id: string;
    attendance_timestamp: string;
    status: string;
    distance_from_academy: number;
    latitude: number;
    longitude: number;
}

interface SessionWithAttendance extends Session {
    attendance: AttendanceRecord[];
}

export default function CoachAttendancePage() {
    const locale = useLocale();
    const supabase = createClient();

    const [tab, setTab] = useState<'mark' | 'history'>('mark');
    const [loading, setLoading] = useState(true);

    // Mark tab
    const [upcoming, setUpcoming] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [markedMap, setMarkedMap] = useState<Record<string, AttendanceRecord[]>>({});

    // History tab
    const [history, setHistory] = useState<SessionWithAttendance[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().substring(0, 7));

    const today = new Date().toISOString().split('T')[0];

    // ── Load upcoming sessions for Mark tab ──────────────────────────────────
    const loadUpcoming = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, session_date, start_time, end_time, session_type, courses(name)')
            .eq('paid_coach_id', user.id)
            .gte('session_date', today)
            .order('session_date')
            .order('start_time');

        const sessions = (sessionsData as Session[]) || [];
        setUpcoming(sessions);

        // Load attendance marks for each upcoming session
        if (sessions.length > 0) {
            const map: Record<string, AttendanceRecord[]> = {};
            for (const s of sessions) {
                const { data } = await supabase
                    .from('coach_attendance')
                    .select('id, attendance_timestamp, status, distance_from_academy, latitude, longitude')
                    .eq('session_id', s.id)
                    .eq('coach_id', user.id)
                    .order('attendance_timestamp', { ascending: false });
                map[s.id] = (data as AttendanceRecord[]) || [];
            }
            setMarkedMap(map);
        }
        setLoading(false);
    }, [today]);

    // ── Load history for History tab ─────────────────────────────────────────
    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoading(false); return; }

        const [year, month] = historyMonth.split('-');
        const lastDay = new Date(Number(year), Number(month), 0).getDate(); // real last day of month
        const startDate = `${historyMonth}-01`;
        const endDate = `${historyMonth}-${String(lastDay).padStart(2, '0')}`;

        const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, session_date, start_time, end_time, session_type, courses(name)')
            .eq('paid_coach_id', user.id)
            .gte('session_date', startDate)
            .lte('session_date', endDate)
            .order('session_date', { ascending: false })
            .order('start_time', { ascending: false });

        const sessions = (sessionsData as Session[]) || [];

        // Load attendance for each session
        const result: SessionWithAttendance[] = [];
        for (const s of sessions) {
            const { data: attData } = await supabase
                .from('coach_attendance')
                .select('id, attendance_timestamp, status, distance_from_academy, latitude, longitude')
                .eq('session_id', s.id)
                .eq('coach_id', user.id)
                .order('attendance_timestamp', { ascending: false });
            result.push({ ...s, attendance: (attData as AttendanceRecord[]) || [] });
        }

        setHistory(result);
        setHistoryLoading(false);
    }, [historyMonth]);

    useEffect(() => { loadUpcoming(); }, [loadUpcoming]);
    useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

    const formatTime = (t: string) => t?.substring(0, 5) || '';
    const isToday = (d: string) => d === today;

    const activityLabel: Record<string, string> = {
        online_session: 'Session',
        offline_meeting: 'Offline',
        training: 'Training',
        consultation: 'Consultation',
        workshop: 'Workshop',
        tutoring: 'Tutoring',
        other: 'Other',
    };

    return (
        <div className="page-container">
            <div className="max-w-4xl mx-auto">
                <Link href={`/${locale}/coach/sessions`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    ← Back to Sessions
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Attendance</h1>
                    <p className="text-white/70">Mark your attendance or view your history</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {([
                        { key: 'mark', label: 'Mark Attendance' },
                        { key: 'history', label: 'Attendance History' },
                    ] as const).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key
                                    ? 'bg-primary text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── MARK TAB ───────────────────────────────── */}
                {tab === 'mark' && (
                    loading ? (
                        <GlassCard><p className="text-white/70 text-center py-8">Loading sessions...</p></GlassCard>
                    ) : upcoming.length === 0 ? (
                        <GlassCard>
                            <div className="text-center py-12">
                                <p className="text-white/70 mb-2">No upcoming sessions scheduled</p>
                                <Link href={`/${locale}/coach/sessions`} className="text-primary hover:underline text-sm">
                                    View all sessions →
                                </Link>
                            </div>
                        </GlassCard>
                    ) : (
                        <div className="space-y-6">
                            <GlassCard>
                                <h2 className="text-lg font-semibold text-white mb-4">Select a Session</h2>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {upcoming.map((s) => {
                                        const marked = (markedMap[s.id] || []).length > 0;
                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => setSelectedSession(s)}
                                                className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedSession?.id === s.id
                                                        ? 'bg-primary/20 border-primary/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="text-white font-medium">{s.courses?.name || 'Unknown Course'}</p>
                                                            <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/70">
                                                                {activityLabel[s.session_type] || s.session_type}
                                                            </span>
                                                            {isToday(s.session_date) && (
                                                                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded">Today</span>
                                                            )}
                                                        </div>
                                                        <p className="text-white/60 text-sm">
                                                            {s.session_date} · {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                                        </p>
                                                    </div>
                                                    {marked && (
                                                        <span className="flex items-center gap-1 text-green-400 text-sm ml-3">
                                                            ✓ <span className="text-xs">Marked</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {marked && markedMap[s.id]?.[0] && (
                                                    <p className="mt-2 text-xs text-white/40 border-t border-white/10 pt-2">
                                                        Last marked at {new Date(markedMap[s.id][0].attendance_timestamp).toLocaleTimeString()} · {markedMap[s.id][0].distance_from_academy}m away
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </GlassCard>

                            {selectedSession && (
                                <AttendanceMarker
                                    sessionId={selectedSession.id}
                                    sessionDate={selectedSession.session_date}
                                    courseName={selectedSession.courses?.name || 'Unknown'}
                                    startTime={formatTime(selectedSession.start_time)}
                                    endTime={formatTime(selectedSession.end_time)}
                                    onSuccess={loadUpcoming}
                                />
                            )}
                        </div>
                    )
                )}

                {/* ── HISTORY TAB ───────────────────────────── */}
                {tab === 'history' && (
                    <div className="space-y-6">
                        {/* Month filter */}
                        <GlassCard>
                            <label className="block text-white/70 text-sm font-medium mb-2">Filter by Month</label>
                            <input
                                type="month"
                                value={historyMonth}
                                onChange={(e) => setHistoryMonth(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </GlassCard>

                        {historyLoading ? (
                            <GlassCard><p className="text-white/70 text-center py-8">Loading history...</p></GlassCard>
                        ) : history.length === 0 ? (
                            <GlassCard><p className="text-white/70 text-center py-8">No sessions found for this month</p></GlassCard>
                        ) : (
                            <div className="space-y-4">
                                {/* Summary stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <GlassCard>
                                        <p className="text-white/50 text-xs mb-1">Sessions</p>
                                        <p className="text-2xl font-bold text-white">{history.length}</p>
                                    </GlassCard>
                                    <GlassCard>
                                        <p className="text-white/50 text-xs mb-1">Attended</p>
                                        <p className="text-2xl font-bold text-green-400">
                                            {history.filter((s) => s.attendance.length > 0).length}
                                        </p>
                                    </GlassCard>
                                    <GlassCard>
                                        <p className="text-white/50 text-xs mb-1">Missed</p>
                                        <p className="text-2xl font-bold text-red-400">
                                            {history.filter((s) => s.attendance.length === 0 && s.session_date < today).length}
                                        </p>
                                    </GlassCard>
                                </div>

                                {/* Session cards */}
                                {history.map((s) => {
                                    const attended = s.attendance.length > 0;
                                    const isPast = s.session_date < today;
                                    return (
                                        <GlassCard key={s.id}>
                                            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <p className="text-white font-semibold">{s.courses?.name || 'Unknown Course'}</p>
                                                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/60">
                                                            {activityLabel[s.session_type] || s.session_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-white/50 text-sm">
                                                        {s.session_date} · {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${attended
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : isPast
                                                            ? 'bg-red-500/20 text-red-300'
                                                            : 'bg-yellow-500/20 text-yellow-300'
                                                    }`}>
                                                    {attended ? 'Attended' : isPast ? 'Missed' : 'Upcoming'}
                                                </span>
                                            </div>

                                            {attended && (
                                                <div className="space-y-2 border-t border-white/10 pt-3">
                                                    {s.attendance.map((rec) => (
                                                        <div key={rec.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                                            <div>
                                                                <p className="text-white text-sm">
                                                                    {new Date(rec.attendance_timestamp).toLocaleString()}
                                                                </p>
                                                                <p className="text-white/40 text-xs">
                                                                    {rec.distance_from_academy}m from academy
                                                                </p>
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded font-medium ${rec.status === 'present'
                                                                    ? 'bg-green-500/20 text-green-300'
                                                                    : rec.status === 'late'
                                                                        ? 'bg-yellow-500/20 text-yellow-300'
                                                                        : 'bg-blue-500/20 text-blue-300'
                                                                }`}>
                                                                {rec.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {!attended && isPast && (
                                                <p className="text-white/30 text-xs border-t border-white/10 pt-3 italic">
                                                    No attendance record found for this session
                                                </p>
                                            )}
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
