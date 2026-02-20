'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { GlassCard } from '@/components/layout/GlassCard';

interface AttendanceRecord {
    id: string;
    coach_id: string;
    session_id: string;
    latitude: number;
    longitude: number;
    distance_from_academy: number;
    attendance_timestamp: string;
    status: string;
    profiles: { full_name: string };
    sessions: { session_date: string; start_time: string; courses: { name: string } };
}

export default function AdminAttendanceViewPage() {
    const locale = useLocale();
    const t = useTranslations('common');
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [filter, setFilter] = useState({
        month: new Date().toISOString().substring(0, 7),
        coachId: '',
    });

    useEffect(() => {
        loadAttendance();
    }, [filter]);

    const loadAttendance = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('coach_attendance')
                .select(
                    `
                    id,
                    coach_id,
                    session_id,
                    latitude,
                    longitude,
                    distance_from_academy,
                    attendance_timestamp,
                    status,
                    profiles(full_name),
                    sessions(session_date, start_time, courses(name))
                `
                )
                .order('attendance_timestamp', { ascending: false });

            // Filter by month (use real last day of month)
            const [year, month] = filter.month.split('-');
            const startDate = `${filter.month}-01`;
            const lastDay = new Date(Number(year), Number(month), 0).getDate();
            const endDate = `${filter.month}-${String(lastDay).padStart(2, '0')}`;

            query = query
                .gte('attendance_timestamp', startDate)
                .lte('attendance_timestamp', endDate);

            // Filter by coach if selected
            if (filter.coachId) {
                query = query.eq('coach_id', filter.coachId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading attendance:', error.message, error.details, error.hint);
                setLoading(false);
                return;
            }

            setAttendance((data as any) || []);
            setLoading(false);
        } catch (error: any) {
            console.error('Error:', error?.message || error);
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        return time.substring(0, 5);
    };

    const formatDateTime = (dateTime: string) => {
        return new Date(dateTime).toLocaleString();
    };

    const getStatusBadgeColor = (status: string) => {
        const colors: { [key: string]: string } = {
            present: 'bg-green-500/20 text-green-200',
            late: 'bg-yellow-500/20 text-yellow-200',
            absent: 'bg-red-500/20 text-red-200',
            excused: 'bg-blue-500/20 text-blue-200',
        };
        return colors[status] || colors.present;
    };

    const stats = {
        total: attendance.length,
        averageDistance: attendance.length
            ? (
                attendance.reduce((sum, a) => sum + a.distance_from_academy, 0) /
                attendance.length
            ).toFixed(1)
            : 0,
        withinRadius: attendance.filter((a) => a.distance_from_academy <= 50).length,
        outsideRadius: attendance.filter((a) => a.distance_from_academy > 50).length,
    };

    return (
        <div className="page-container">
            <div className="max-w-6xl mx-auto">
                <Link
                    href={`/${locale}/admin/dashboard`}
                    className="text-white/60 hover:text-white transition-colors text-sm mb-8 block"
                >
                    ← Back to Dashboard
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                        Attendance Records
                    </h1>
                    <p className="text-white/70">View GPS attendance logs for all coaches</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Within 50m</p>
                        <p className="text-3xl font-bold text-green-400">{stats.withinRadius}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Outside 50m</p>
                        <p className="text-3xl font-bold text-red-400">{stats.outsideRadius}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Avg Distance</p>
                        <p className="text-3xl font-bold text-white">{stats.averageDistance}m</p>
                    </GlassCard>
                </div>

                {/* Filters */}
                <GlassCard className="mb-6">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Month
                            </label>
                            <input
                                type="month"
                                value={filter.month}
                                onChange={(e) =>
                                    setFilter({ ...filter, month: e.target.value })
                                }
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <button
                            onClick={() => setFilter({ ...filter, coachId: '' })}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors text-sm"
                        >
                            Clear Filters
                        </button>
                    </div>
                </GlassCard>

                {/* Attendance Table */}
                {loading ? (
                    <GlassCard>
                        <p className="text-white/70 text-center py-8">Loading...</p>
                    </GlassCard>
                ) : attendance.length === 0 ? (
                    <GlassCard>
                        <p className="text-white/70 text-center py-8">
                            No attendance records for this period
                        </p>
                    </GlassCard>
                ) : (
                    <GlassCard>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            Coach
                                        </th>
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            Course
                                        </th>
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            Time
                                        </th>
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            Distance
                                        </th>
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-white/60 font-medium">
                                            GPS Coords
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {attendance.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-white">
                                                {record.profiles?.full_name || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3 text-white/80">
                                                {record.sessions?.courses?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-white/80">
                                                {record.sessions?.session_date || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-white/80">
                                                {formatTime(record.sessions?.start_time || '')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`
                                                        px-2 py-1 rounded text-xs font-medium
                                                        ${record.distance_from_academy <= 50
                                                            ? 'bg-green-500/20 text-green-200'
                                                            : 'bg-red-500/20 text-red-200'
                                                        }
                                                    `}
                                                >
                                                    {record.distance_from_academy}m
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                                                        record.status
                                                    )}`}
                                                >
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-white/60 text-xs">
                                                {record.latitude.toFixed(5)},{' '}
                                                {record.longitude.toFixed(5)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
