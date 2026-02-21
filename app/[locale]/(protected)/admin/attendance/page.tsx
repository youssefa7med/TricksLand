'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';

interface AttendanceRecord {
    id: string;
    coach_id: string;
    session_id: string;
    latitude: number;
    longitude: number;
    distance_from_academy: number;
    attendance_timestamp: string;
    status: string;
    marked_by_admin: boolean;
    profiles: { full_name: string };
    sessions: { session_date: string; start_time: string; courses: { name: string } };
}

interface PendingSession {
    id: string;
    session_date: string;
    start_time: string;
    attendance_required: boolean;
    paid_coach_id: string;
    profiles: { full_name: string };
    courses: { name: string };
}

export default function AdminAttendanceViewPage() {
    const locale = useLocale();
    const supabase = createClient();

    const [tab, setTab] = useState<'records' | 'pending'>('pending');
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [pending, setPending] = useState<PendingSession[]>([]);
    const [marking, setMarking] = useState<string | null>(null);
    const [filter, setFilter] = useState({
        month: new Date().toISOString().substring(0, 7),
    });

    const loadAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const [year, month] = filter.month.split('-');
            const startDate = `${filter.month}-01`;
            const lastDay = new Date(Number(year), Number(month), 0).getDate();
            const endDate = `${filter.month}-${String(lastDay).padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('coach_attendance')
                .select(`
                    id, coach_id, session_id,
                    latitude, longitude, distance_from_academy,
                    attendance_timestamp, status, marked_by_admin,
                    profiles(full_name),
                    sessions(session_date, start_time, courses(name))
                `)
                .gte('attendance_timestamp', startDate)
                .lte('attendance_timestamp', endDate + 'T23:59:59')
                .order('attendance_timestamp', { ascending: false });

            if (error) console.error('Error loading attendance:', error.message);
            setAttendance((data as any) || []);

            // Load pending: sessions that require attendance but have no record in this month
            const { data: pendingData, error: pendingError } = await supabase
                .from('sessions')
                .select(`id, session_date, start_time, attendance_required, paid_coach_id, profiles!sessions_paid_coach_id_fkey(full_name), courses(name)`)
                .eq('attendance_required', true)
                .gte('session_date', startDate)
                .lte('session_date', endDate)
                .order('session_date', { ascending: false });

            if (pendingError) console.error('Error loading pending sessions:', pendingError.message);

            const attendedSessionIds = new Set((attendance).map(a => a.session_id));
            const freshAttended = new Set(((data as any) || []).map((a: any) => a.session_id));
            const unattended = ((pendingData as any) || []).filter((s: any) => !freshAttended.has(s.id));
            setPending(unattended);

        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filter.month]);

    useEffect(() => { loadAttendance(); }, [loadAttendance]);

    const handleAdminMark = async (session: PendingSession, status: 'present' | 'excused') => {
        setMarking(session.id);
        try {
            const res = await fetch('/api/admin/attendance/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session.id, coachId: session.paid_coach_id, status }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(`Marked as ${status}`);
            loadAttendance();
        } catch (err: any) {
            toast.error(err.message || 'Failed to mark attendance');
        } finally {
            setMarking(null);
        }
    };

    const handleRemoveAttendance = async (attendanceId: string) => {
        if (!confirm('Remove this attendance record?')) return;
        const res = await fetch('/api/admin/attendance/mark', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendanceId }),
        });
        if (res.ok) { toast.success('Record removed'); loadAttendance(); }
        else { const j = await res.json(); toast.error(j.error); }
    };

    const getStatusBadge = (status: string) => ({
        present: 'bg-green-500/20 text-green-300',
        late: 'bg-yellow-500/20 text-yellow-300',
        absent: 'bg-red-500/20 text-red-300',
        excused: 'bg-blue-500/20 text-blue-300',
    }[status] || 'bg-white/10 text-white/60');

    const stats = {
        total: attendance.length,
        present: attendance.filter(a => a.status === 'present').length,
        late: attendance.filter(a => a.status === 'late').length,
        pendingCount: pending.length,
    };

    return (
        <div className="page-container">
            <div className="max-w-6xl mx-auto">
                <Link href={`/${locale}/admin/dashboard`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    ← Back to Dashboard
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Attendance Management</h1>
                    <p className="text-white/70">Track and manage coach attendance records</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">GPS Records</p>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Present</p>
                        <p className="text-3xl font-bold text-green-400">{stats.present}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Late</p>
                        <p className="text-3xl font-bold text-yellow-400">{stats.late}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1 flex items-center gap-1">
                            Pending
                            {stats.pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{stats.pendingCount}</span>
                            )}
                        </p>
                        <p className="text-3xl font-bold text-red-400">{stats.pendingCount}</p>
                    </GlassCard>
                </div>

                {/* Month filter */}
                <GlassCard className="mb-6">
                    <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-white/80 text-sm font-medium mb-2">Month</label>
                            <input
                                type="month"
                                value={filter.month}
                                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Tab navigation */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setTab('pending')}
                        className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${tab === 'pending' ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                    >
                        ⚠ Pending
                        {stats.pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{stats.pendingCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('records')}
                        className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${tab === 'records' ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                    >
                        GPS Records
                    </button>
                </div>

                {loading ? (
                    <GlassCard><p className="text-white/70 text-center py-8">Loading...</p></GlassCard>
                ) : tab === 'pending' ? (
                    /* ── Pending Tab ── */
                    pending.length === 0 ? (
                        <GlassCard>
                            <div className="text-center py-12">
                                <p className="text-4xl mb-3">✅</p>
                                <p className="text-white font-semibold text-lg">All sessions accounted for!</p>
                                <p className="text-white/60 text-sm mt-1">No sessions are missing attendance this month.</p>
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard>
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-white">Sessions Missing Attendance</h2>
                                <p className="text-white/60 text-sm">These sessions required attendance but none was recorded.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Coach</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Course</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Date</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Time</th>
                                            <th className="px-4 py-3 text-right text-white/60 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {pending.map((session) => (
                                            <tr key={session.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">
                                                    {(session.profiles as any)?.full_name || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-white/80">
                                                    {(session.courses as any)?.name || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-white/80">{session.session_date}</td>
                                                <td className="px-4 py-3 text-white/80">{session.start_time?.substring(0, 5)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAdminMark(session, 'present')}
                                                            disabled={marking === session.id}
                                                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {marking === session.id ? '...' : '✓ Present'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAdminMark(session, 'excused')}
                                                            disabled={marking === session.id}
                                                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            Excused
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    )
                ) : (
                    /* ── GPS Records Tab ── */
                    attendance.length === 0 ? (
                        <GlassCard>
                            <p className="text-white/70 text-center py-8">No attendance records for this period</p>
                        </GlassCard>
                    ) : (
                        <GlassCard>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Coach</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Course</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Date</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Status</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Distance</th>
                                            <th className="px-4 py-3 text-left text-white/60 font-medium">Source</th>
                                            <th className="px-4 py-3 text-right text-white/60 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {attendance.map((record) => (
                                            <tr key={record.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white">{record.profiles?.full_name || '—'}</td>
                                                <td className="px-4 py-3 text-white/80">{record.sessions?.courses?.name || '—'}</td>
                                                <td className="px-4 py-3 text-white/80">{record.sessions?.session_date || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(record.status)}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-white/70 text-xs">
                                                    {record.marked_by_admin ? '—' : `${record.distance_from_academy}m`}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {record.marked_by_admin ? (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Admin</span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400">GPS</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleRemoveAttendance(record.id)}
                                                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    )
                )}
            </div>
        </div>
    );
}
