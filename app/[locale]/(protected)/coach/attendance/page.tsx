'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
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
}

export default function CoachAttendancePage() {
    const locale = useLocale();
    const t = useTranslations('common');
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [attendance, setAttendance] = useState<{
        [key: string]: AttendanceRecord[];
    }>({});

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get today's and upcoming sessions
            const today = new Date().toISOString().split('T')[0];

            const { data: sessionsData, error } = await supabase
                .from('sessions')
                .select('id, session_date, start_time, end_time, session_type, courses(name)')
                .eq('paid_coach_id', user.id)
                .gte('session_date', today)
                .order('session_date')
                .order('start_time');

            if (error) {
                console.error('Error loading sessions:', error);
                return;
            }

            setSessions(sessionsData as Session[] || []);

            // Load attendance for each session
            if (sessionsData && sessionsData.length > 0) {
                const attendanceData: { [key: string]: AttendanceRecord[] } = {};
                const typedSessions = sessionsData as Session[];

                for (const session of typedSessions) {
                    const { data: attData } = await supabase
                        .from('coach_attendance')
                        .select('id, attendance_timestamp, status, distance_from_academy')
                        .eq('session_id', session.id)
                        .order('attendance_timestamp', { ascending: false });

                    if (attData) {
                        attendanceData[session.id] = attData as AttendanceRecord[];
                    }
                }

                setAttendance(attendanceData);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    const getActivityTypeLabel = (type: string) => {
        const labels: { [key: string]: string } = {
            'online_session': 'Online',
            'offline_meeting': 'Offline',
            'training': 'Training',
            'consultation': 'Consultation',
            'workshop': 'Workshop',
            'tutoring': 'Tutoring',
            'other': 'Other',
        };
        return labels[type] || type;
    };

    const isToday = (dateStr: string) => {
        return dateStr === new Date().toISOString().split('T')[0];
    };

    const formatTime = (time: string) => {
        return time.substring(0, 5);
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <p className="text-white/70">Loading sessions...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="max-w-4xl mx-auto">
                <Link
                    href={`/${locale}/coach/sessions`}
                    className="text-white/60 hover:text-white transition-colors text-sm mb-8 block"
                >
                    ← Back to Sessions
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                        Mark Attendance
                    </h1>
                    <p className="text-white/70">
                        Use GPS to mark your attendance for sessions
                    </p>
                </div>

                {sessions.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-2">
                                No sessions scheduled for today or coming up
                            </p>
                            <Link
                                href={`/${locale}/coach/sessions`}
                                className="text-primary hover:underline text-sm"
                            >
                                View all sessions →
                            </Link>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="space-y-6">
                        {/* Sessions List */}
                        <GlassCard>
                            <h2 className="text-lg font-semibold text-white mb-4">
                                Available Sessions
                            </h2>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sessions.map((session) => {
                                    const isSessionMarked =
                                        attendance[session.id] &&
                                        attendance[session.id].length > 0;
                                    const today = isToday(session.session_date);

                                    return (
                                        <div
                                            key={session.id}
                                            onClick={() => setSelectedSession(session)}
                                            className={`
                                                p-4 rounded-lg border transition-all cursor-pointer
                                                ${selectedSession?.id === session.id
                                                    ? 'bg-primary/20 border-primary/50'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-white font-medium">
                                                            {session.courses?.name || 'Unknown Course'}
                                                        </p>
                                                        <span className="text-xs px-2 py-1 bg-white/10 rounded">
                                                            {getActivityTypeLabel(
                                                                session.session_type
                                                            )}
                                                        </span>
                                                        {today && (
                                                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-200 rounded">
                                                                Today
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/60 text-sm">
                                                        {session.session_date} •{' '}
                                                        {formatTime(session.start_time)} –{' '}
                                                        {formatTime(session.end_time)}
                                                    </p>
                                                </div>

                                                {isSessionMarked && (
                                                    <div className="flex items-center gap-1 text-green-400">
                                                        <span>✓</span>
                                                        <span className="text-xs">
                                                            Marked
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {isSessionMarked &&
                                                attendance[session.id] && (
                                                    <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/50">
                                                        Last marked:{' '}
                                                        {new Date(
                                                            attendance[session.id][0]
                                                                .attendance_timestamp
                                                        ).toLocaleTimeString()}
                                                        ({attendance[session.id][0].distance_from_academy}m away)
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassCard>

                        {/* Attendance Marker */}
                        {selectedSession && (
                            <AttendanceMarker
                                sessionId={selectedSession.id}
                                sessionDate={selectedSession.session_date}
                                courseName={selectedSession.courses?.name || 'Unknown'}
                                startTime={formatTime(selectedSession.start_time)}
                                endTime={formatTime(selectedSession.end_time)}
                                onSuccess={loadSessions}
                            />
                        )}

                        {selectedSession && attendance[selectedSession.id] && (
                            <GlassCard>
                                <h2 className="text-lg font-semibold text-white mb-4">
                                    Attendance History
                                </h2>
                                <div className="space-y-2">
                                    {attendance[selectedSession.id].map((record) => (
                                        <div
                                            key={record.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-white text-sm">
                                                    {new Date(
                                                        record.attendance_timestamp
                                                    ).toLocaleString()}
                                                </p>
                                                <p className="text-white/60 text-xs">
                                                    Distance: {record.distance_from_academy}m
                                                </p>
                                            </div>
                                            <span className="px-2 py-1 bg-green-500/20 text-green-200 text-xs rounded">
                                                {record.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
