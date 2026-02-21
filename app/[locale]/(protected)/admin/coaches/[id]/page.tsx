'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminCoachProfilePage() {
    const params = useParams();
    const router = useRouter();
    const locale = useLocale();
    const coachId = params.id as string;
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [coach, setCoach] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [rates, setRates] = useState<any[]>([]);
    const [editingRate, setEditingRate] = useState(false);
    const [rateForm, setRateForm] = useState({
        base_hourly_rate: '',
        rate_effective_from: '',
        next_rate_increase_date: '',
    });

    useEffect(() => {
        loadCoachData();
    }, [coachId]);

    const loadCoachData = async () => {
        setLoading(true);
        try {
            // Load coach profile
            const { data: coachData, error: coachError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', coachId)
                .eq('role', 'coach')
                .single();

            if (coachError) throw coachError;
            setCoach(coachData);

            // Load coach's courses
            const { data: coursesData } = await supabase
                .from('course_coaches')
                .select('courses (id, name, status, hourly_rate)')
                .eq('coach_id', coachId);

            setCourses((coursesData || []).map((cc: any) => cc.courses).filter(Boolean));

            // Load coach's sessions (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: sessionsData } = await supabase
                .from('sessions')
                .select(`
                    id, session_date, start_time, end_time,
                    computed_hours, applied_rate, subtotal,
                    courses (name)
                `)
                .eq('paid_coach_id', coachId)
                .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('session_date', { ascending: false })
                .limit(50);

            setSessions(sessionsData || []);

            // Load coach's rate history
            const { data: ratesData } = await supabase
                .from('hourly_rates')
                .select('id, course_id, rate, effective_from, courses (name)')
                .eq('coach_id', coachId)
                .order('effective_from', { ascending: false })
                .limit(20);

            setRates(ratesData || []);

            // Set form values
            if (coachData) {
                setRateForm({
                    base_hourly_rate: (coachData as any).base_hourly_rate || '',
                    rate_effective_from: (coachData as any).rate_effective_from || '',
                    next_rate_increase_date: (coachData as any).next_rate_increase_date || '',
                });
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load coach data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRate = async () => {
        const baseRate = parseFloat(rateForm.base_hourly_rate);
        if (isNaN(baseRate) || baseRate <= 0) {
            toast.error('Please enter a valid base rate');
            return;
        }

        const { error } = await (supabase as any)
            .from('profiles')
            .update({
                base_hourly_rate: baseRate,
                rate_effective_from: rateForm.rate_effective_from || new Date().toISOString().split('T')[0],
                next_rate_increase_date: rateForm.next_rate_increase_date || null,
            })
            .eq('id', coachId);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Coach rate updated successfully');
            setEditingRate(false);
            loadCoachData();
        }
    };

    const calculateCurrentRate = () => {
        if (!coach || !(coach as any).base_hourly_rate || !(coach as any).rate_effective_from) return null;
        
        const baseRate = Number((coach as any).base_hourly_rate);
        const effectiveDate = new Date((coach as any).rate_effective_from);
        const today = new Date();
        const yearsPassed = Math.floor((today.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
        
        let currentRate = baseRate;
        for (let i = 0; i < yearsPassed; i++) {
            currentRate *= 1.25;
        }
        return Math.round(currentRate * 100) / 100;
    };

    const stats = {
        totalSessions: sessions.length,
        totalHours: sessions.reduce((sum, s) => sum + (s.computed_hours || 0), 0),
        totalEarnings: sessions.reduce((sum, s) => sum + (s.subtotal || 0), 0),
        averageRate: sessions.length > 0
            ? sessions.reduce((sum, s) => sum + (s.applied_rate || 0), 0) / sessions.length
            : 0,
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <p className="text-white/70 text-lg">Loading...</p>
            </div>
        );
    }

    if (!coach) {
        return (
            <div className="page-container">
                <p className="text-white/70">Coach not found</p>
                <Link href={`/${locale}/admin/coaches`} className="text-primary">Back to Coaches</Link>
            </div>
        );
    }

    const currentRate = calculateCurrentRate();

    return (
        <div className="page-container">
            <div className="max-w-6xl mx-auto">
                <Link
                    href={`/${locale}/admin/coaches`}
                    className="text-white/60 hover:text-white transition-colors text-sm mb-8 block"
                >
                    ← Back to Coaches
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{coach.full_name}</h1>
                    <p className="text-white/70">{coach.email}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Total Sessions (30d)</p>
                        <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Total Hours</p>
                        <p className="text-3xl font-bold text-white">{stats.totalHours.toFixed(1)}h</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Total Earnings</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalEarnings)}</p>
                    </GlassCard>
                    <GlassCard>
                        <p className="text-white/60 text-sm mb-1">Avg Rate</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(stats.averageRate)}</p>
                    </GlassCard>
                </div>

                {/* Coach Base Rate */}
                <GlassCard className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">Base Hourly Rate</h2>
                            {(coach as any).base_hourly_rate ? (
                                <div>
                                    <p className="text-white/80">
                                        Base Rate: <span className="font-bold text-white">{formatCurrency((coach as any).base_hourly_rate)}</span>
                                    </p>
                                    {(coach as any).rate_effective_from && (
                                        <p className="text-white/60 text-sm mt-1">
                                            Effective from: {formatDate((coach as any).rate_effective_from)}
                                        </p>
                                    )}
                                    {currentRate && currentRate !== Number((coach as any).base_hourly_rate) && (
                                        <p className="text-green-400 text-sm mt-1">
                                            Current Rate (with increases): {formatCurrency(currentRate)}
                                        </p>
                                    )}
                                    {(coach as any).next_rate_increase_date && (
                                        <p className="text-yellow-400 text-sm mt-1">
                                            Next increase: {formatDate((coach as any).next_rate_increase_date)}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-white/60">No base rate set</p>
                            )}
                        </div>
                        <button
                            onClick={() => setEditingRate(!editingRate)}
                            className="btn-glossy text-sm"
                        >
                            {editingRate ? 'Cancel' : 'Edit Rate'}
                        </button>
                    </div>

                    {editingRate && (
                        <div className="border-t border-white/10 pt-4 mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">
                                        Base Rate (EGP/hr) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={rateForm.base_hourly_rate}
                                        onChange={(e) => setRateForm({ ...rateForm, base_hourly_rate: e.target.value })}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                                        placeholder="50.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">
                                        Effective From
                                    </label>
                                    <input
                                        type="date"
                                        value={rateForm.rate_effective_from}
                                        onChange={(e) => setRateForm({ ...rateForm, rate_effective_from: e.target.value })}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">
                                        Next Increase Date
                                    </label>
                                    <input
                                        type="date"
                                        value={rateForm.next_rate_increase_date}
                                        onChange={(e) => setRateForm({ ...rateForm, next_rate_increase_date: e.target.value })}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                                    />
                                    <p className="text-white/40 text-xs mt-1">Rate increases 25% annually</p>
                                </div>
                            </div>
                            <button onClick={handleUpdateRate} className="btn-glossy">
                                Save Rate
                            </button>
                        </div>
                    )}
                </GlassCard>

                {/* Assigned Courses */}
                <GlassCard className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Assigned Courses</h2>
                    {courses.length === 0 ? (
                        <p className="text-white/60">No courses assigned</p>
                    ) : (
                        <div className="space-y-2">
                            {courses.map((course: any) => (
                                <div key={course.id} className="flex justify-between items-center py-2 border-b border-white/5">
                                    <div>
                                        <p className="text-white font-medium">{course.name}</p>
                                        <p className="text-white/60 text-sm">
                                            Status: {course.status} {course.hourly_rate && `• Course Rate: ${formatCurrency(course.hourly_rate)}`}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/${locale}/admin/courses/${course.id}/coaches`}
                                        className="text-primary hover:text-white text-sm"
                                    >
                                        View →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>

                {/* Rate History */}
                <GlassCard className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Rate History (Course-Specific)</h2>
                    {rates.length === 0 ? (
                        <p className="text-white/60">No course-specific rates set</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-white/60">Course</th>
                                        <th className="text-left py-2 px-3 text-white/60">Rate</th>
                                        <th className="text-left py-2 px-3 text-white/60">Effective From</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rates.map((rate: any) => (
                                        <tr key={rate.id} className="border-b border-white/5">
                                            <td className="py-2 px-3 text-white">{(rate.courses as any)?.name || '-'}</td>
                                            <td className="py-2 px-3 text-white">{formatCurrency(rate.rate)}</td>
                                            <td className="py-2 px-3 text-white/80">{formatDate(rate.effective_from)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>

                {/* Recent Sessions */}
                <GlassCard>
                    <h2 className="text-xl font-semibold text-white mb-4">Recent Sessions (Last 30 Days)</h2>
                    {sessions.length === 0 ? (
                        <p className="text-white/60">No sessions in the last 30 days</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 text-white/60">Date</th>
                                        <th className="text-left py-2 px-3 text-white/60">Course</th>
                                        <th className="text-left py-2 px-3 text-white/60">Hours</th>
                                        <th className="text-left py-2 px-3 text-white/60">Rate</th>
                                        <th className="text-right py-2 px-3 text-white/60">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session: any) => (
                                        <tr key={session.id} className="border-b border-white/5">
                                            <td className="py-2 px-3 text-white">{formatDate(session.session_date)}</td>
                                            <td className="py-2 px-3 text-white">{(session.courses as any)?.name || '-'}</td>
                                            <td className="py-2 px-3 text-white">{session.computed_hours}h</td>
                                            <td className="py-2 px-3 text-white">{formatCurrency(session.applied_rate)}</td>
                                            <td className="py-2 px-3 text-white text-right font-semibold">{formatCurrency(session.subtotal)}</td>
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
