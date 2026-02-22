'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Course { id: string; name: string; }

type ReportType = 'student-attendance' | 'course-attendance' | 'financial' | 'coach-hours' | 'coach-payroll';

const REPORT_LABELS: Record<ReportType, string> = {
    'student-attendance': '📋 Student Attendance',
    'course-attendance': '📊 Course Attendance',
    'financial': '💰 Course Financial',
    'coach-hours': '⏱ Coach Hours',
    'coach-payroll': '💼 Coach Payroll',
};

export default function AdminReportsPage() {
    const supabase = createClient();

    const [courses, setCourses] = useState<Course[]>([]);
    const [coaches, setCoaches] = useState<{ id: string; full_name: string }[]>([]);
    const [reportType, setReportType] = useState<ReportType>('student-attendance');
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedCoach, setSelectedCoach] = useState('');

    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from('courses').select('id, name').order('name'),
            supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
        ]).then(([{ data: coursesData }, { data: coachesData }]) => {
            setCourses(coursesData || []);
            setCoaches(coachesData || []);
        });
    }, []);

    // Helper: compute last day of a YYYY-MM month string
    const getMonthRange = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        return { start: `${ym}-01`, end: `${ym}-${String(lastDay).padStart(2, '0')}` };
    };

    const generateReport = async () => {
        setLoading(true);
        setReportData([]);
        try {
            switch (reportType) {
                case 'student-attendance': {
                    let q = (supabase as any).from('student_monthly_attendance').select('*').eq('month', month);
                    if (selectedCourse) q = q.eq('course_id', selectedCourse);
                    q = q.order('student_name');
                    const { data, error } = await q;
                    if (error) throw error;
                    setReportData(data || []);
                    break;
                }
                case 'course-attendance': {
                    let q = (supabase as any).from('student_monthly_attendance').select('*').eq('month', month);
                    if (selectedCourse) q = q.eq('course_id', selectedCourse);
                    const { data, error } = await q;
                    if (error) throw error;
                    // Aggregate by course
                    const courseMap: Record<string, any> = {};
                    (data || []).forEach((r: any) => {
                        if (!courseMap[r.course_id]) {
                            courseMap[r.course_id] = {
                                course_id: r.course_id,
                                course_name: r.course_name,
                                total_students: 0,
                                total_sessions: 0,
                                total_attended: 0,
                                avg_rate: 0,
                            };
                        }
                        courseMap[r.course_id].total_students++;
                        courseMap[r.course_id].total_sessions += Number(r.total_sessions || 0);
                        courseMap[r.course_id].total_attended += Number(r.sessions_attended || 0);
                    });
                    const aggregated = Object.values(courseMap).map((c: any) => ({
                        ...c,
                        avg_rate: c.total_sessions > 0 ? Math.round(c.total_attended / c.total_sessions * 100) : 0,
                    }));
                    setReportData(aggregated);
                    break;
                }
                case 'financial': {
                    let q = (supabase as any).from('course_financial_summary').select('*');
                    if (selectedCourse) q = q.eq('course_id', selectedCourse);
                    q = q.order('course_name');
                    const { data, error } = await q;
                    if (error) throw error;
                    setReportData(data || []);
                    break;
                }
                case 'coach-hours': {
                    const { start, end } = getMonthRange(month);
                    let q = supabase.from('sessions')
                        .select('session_date, courses(name), computed_hours, applied_rate, subtotal, paid_coach_id, profiles!sessions_paid_coach_id_fkey(full_name)')
                        .gte('session_date', start)
                        .lte('session_date', end);
                    if (selectedCoach) q = (q as any).eq('paid_coach_id', selectedCoach);
                    const { data, error } = await (q as any).order('session_date');
                    if (error) throw error;
                    setReportData(data || []);
                    break;
                }
                case 'coach-payroll': {
                    let q = (supabase as any).from('coach_monthly_totals').select('*').eq('month', month);
                    const { data, error } = await q.order('coach_name');
                    if (error) throw error;
                    setReportData(data || []);
                    break;
                }
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to generate report');
        }
        setLoading(false);
    };

    const exportToExcel = async () => {
        if (reportData.length === 0) { toast.error('No data to export'); return; }
        setExporting(true);

        try {
            // Use ExcelJS via server action
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: reportType, data: reportData, month, filters: { course: selectedCourse, coach: selectedCoach } }),
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tricksland-${reportType}-${month}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Export complete');
        } catch {
            // Fallback: CSV export
            exportCSV();
        }
        setExporting(false);
    };

    const exportCSV = () => {
        if (reportData.length === 0) return;
        const headers = Object.keys(reportData[0]).join(',');
        const rows = reportData.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','));
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tricksland-${reportType}-${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported as CSV');
    };

    const showCourseFilter = ['student-attendance', 'course-attendance', 'financial'].includes(reportType);
    const showCoachFilter = ['coach-hours'].includes(reportType);

    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Reports</h1>
                <p className="text-white/60 text-sm mt-1">Generate and export monthly reports</p>
            </div>

            {/* Report type selector */}
            <GlassCard className="p-4">
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(REPORT_LABELS) as ReportType[]).map(rt => (
                        <button key={rt} onClick={() => { setReportType(rt); setReportData([]); }}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${reportType === rt ? 'bg-primary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                            {REPORT_LABELS[rt]}
                        </button>
                    ))}
                </div>
            </GlassCard>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-white/70 text-xs mb-1">Month</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>

                    {showCourseFilter && (
                        <div className="flex-1 min-w-48">
                            <label className="block text-white/70 text-xs mb-1">Course (all if empty)</label>
                            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">All Courses</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {showCoachFilter && (
                        <div className="flex-1 min-w-48">
                            <label className="block text-white/70 text-xs mb-1">Coach (all if empty)</label>
                            <select value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">All Coaches</option>
                                {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                    )}

                    <button onClick={generateReport} disabled={loading}
                        className="bg-primary hover:bg-primary/80 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        {loading ? 'Generating…' : '🔍 Generate'}
                    </button>
                </div>
            </GlassCard>

            {/* Report output */}
            {reportData.length > 0 && (
                <GlassCard className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-semibold">{REPORT_LABELS[reportType]}</h3>
                            <p className="text-white/50 text-xs mt-0.5">{reportData.length} records · {month}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportCSV}
                                className="bg-white/10 hover:bg-white/20 text-white/70 px-4 py-2 rounded-lg text-sm transition-colors">
                                ↓ CSV
                            </button>
                            <button onClick={exportToExcel} disabled={exporting}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                {exporting ? 'Exporting…' : '↓ Excel'}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {/* Student Attendance Table */}
                        {reportType === 'student-attendance' && (
                            <table className="w-full text-sm">
                                <thead><tr className="text-white/50 border-b border-white/10">
                                    <th className="text-left p-3">Student</th>
                                    <th className="text-left p-3">Course</th>
                                    <th className="text-center p-3">Sessions</th>
                                    <th className="text-center p-3">Present</th>
                                    <th className="text-center p-3">Absent</th>
                                    <th className="text-center p-3">Late</th>
                                    <th className="text-center p-3">Rate</th>
                                </tr></thead>
                                <tbody>{reportData.map((r, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3 text-white font-medium">{r.student_name}</td>
                                        <td className="p-3 text-white/70">{r.course_name}</td>
                                        <td className="p-3 text-center text-white/80">{r.total_sessions}</td>
                                        <td className="p-3 text-center text-green-400">{r.sessions_attended}</td>
                                        <td className="p-3 text-center text-red-400">{r.sessions_absent}</td>
                                        <td className="p-3 text-center text-yellow-400">{r.sessions_late}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number(r.attendance_percentage) >= 80 ? 'bg-green-500/20 text-green-400' : Number(r.attendance_percentage) >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {r.attendance_percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}

                        {/* Course Attendance Table */}
                        {reportType === 'course-attendance' && (
                            <table className="w-full text-sm">
                                <thead><tr className="text-white/50 border-b border-white/10">
                                    <th className="text-left p-3">Course</th>
                                    <th className="text-center p-3">Students</th>
                                    <th className="text-center p-3">Total Sessions</th>
                                    <th className="text-center p-3">Attended</th>
                                    <th className="text-center p-3">Avg Rate</th>
                                </tr></thead>
                                <tbody>{reportData.map((r, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3 text-white font-medium">{r.course_name}</td>
                                        <td className="p-3 text-center text-white/80">{r.total_students}</td>
                                        <td className="p-3 text-center text-white/80">{r.total_sessions}</td>
                                        <td className="p-3 text-center text-green-400">{r.total_attended}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.avg_rate >= 80 ? 'bg-green-500/20 text-green-400' : r.avg_rate >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {r.avg_rate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}

                        {/* Financial Table */}
                        {reportType === 'financial' && (
                            <table className="w-full text-sm">
                                <thead><tr className="text-white/50 border-b border-white/10">
                                    <th className="text-left p-3">Course</th>
                                    <th className="text-right p-3">Students</th>
                                    <th className="text-right p-3">Collected</th>
                                    <th className="text-right p-3">Pending</th>
                                    <th className="text-right p-3">Expenses</th>
                                    <th className="text-right p-3">Net Profit</th>
                                </tr></thead>
                                <tbody>
                                    {reportData.map((r, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 text-white font-medium">{r.course_name}</td>
                                            <td className="p-3 text-right text-white/80">{r.total_students}</td>
                                            <td className="p-3 text-right text-green-400">{formatCurrency(r.total_income)}</td>
                                            <td className="p-3 text-right text-yellow-400">{formatCurrency(r.pending_income)}</td>
                                            <td className="p-3 text-right text-red-400">{formatCurrency(r.total_expenses)}</td>
                                            <td className={`p-3 text-right font-semibold ${Number(r.net_profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(r.net_profit)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-white/20">
                                        <td className="p-3 text-white/70 font-semibold" colSpan={2}>Total</td>
                                        <td className="p-3 text-right text-green-400 font-semibold">{formatCurrency(reportData.reduce((a, r) => a + Number(r.total_income), 0))}</td>
                                        <td className="p-3 text-right text-yellow-400 font-semibold">{formatCurrency(reportData.reduce((a, r) => a + Number(r.pending_income), 0))}</td>
                                        <td className="p-3 text-right text-red-400 font-semibold">{formatCurrency(reportData.reduce((a, r) => a + Number(r.total_expenses), 0))}</td>
                                        <td className="p-3 text-right font-semibold text-primary">{formatCurrency(reportData.reduce((a, r) => a + Number(r.net_profit), 0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}

                        {/* Coach Hours Table */}
                        {reportType === 'coach-hours' && (
                            <table className="w-full text-sm">
                                <thead><tr className="text-white/50 border-b border-white/10">
                                    <th className="text-left p-3">Date</th>
                                    <th className="text-left p-3">Coach</th>
                                    <th className="text-left p-3">Course</th>
                                    <th className="text-right p-3">Hours</th>
                                    <th className="text-right p-3">Rate</th>
                                    <th className="text-right p-3">Subtotal</th>
                                </tr></thead>
                                <tbody>{reportData.map((r, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3 text-white/80">{r.session_date}</td>
                                        <td className="p-3 text-white">{(r.profiles as any)?.full_name || '—'}</td>
                                        <td className="p-3 text-white/70">{(r.courses as any)?.name || '—'}</td>
                                        <td className="p-3 text-right text-white/80">{r.computed_hours}</td>
                                        <td className="p-3 text-right text-white/60">{formatCurrency(r.applied_rate)}</td>
                                        <td className="p-3 text-right text-primary">{formatCurrency(r.subtotal)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}

                        {/* Coach Payroll Table */}
                        {reportType === 'coach-payroll' && (
                            <table className="w-full text-sm">
                                <thead><tr className="text-white/50 border-b border-white/10">
                                    <th className="text-left p-3">Coach</th>
                                    <th className="text-right p-3">Sessions</th>
                                    <th className="text-right p-3">Hours</th>
                                    <th className="text-right p-3">Gross</th>
                                    <th className="text-right p-3">Bonuses</th>
                                    <th className="text-right p-3">Discounts</th>
                                    <th className="text-right p-3">Net Payable</th>
                                </tr></thead>
                                <tbody>
                                    {reportData.map((r, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3 text-white font-medium">{r.coach_name}</td>
                                            <td className="p-3 text-right text-white/80">{r.session_count}</td>
                                            <td className="p-3 text-right text-white/80">{r.total_hours}</td>
                                            <td className="p-3 text-right text-white/70">{formatCurrency(r.gross_total)}</td>
                                            <td className="p-3 text-right text-green-400">+{formatCurrency(r.total_bonuses)}</td>
                                            <td className="p-3 text-right text-red-400">-{formatCurrency(r.total_discounts)}</td>
                                            <td className="p-3 text-right text-primary font-semibold">{formatCurrency(r.net_total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-white/20">
                                        <td className="p-3 text-white/70 font-semibold" colSpan={6}>Total Payable</td>
                                        <td className="p-3 text-right text-primary font-bold text-base">{formatCurrency(reportData.reduce((a, r) => a + Number(r.net_total), 0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                </GlassCard>
            )}

            {reportData.length === 0 && !loading && (
                <GlassCard className="p-12 text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-white/50">Select a report type and click Generate</p>
                </GlassCard>
            )}
        </div>
    );
}
