'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AdminCourseStudentsPage() {
    const params = useParams();
    const courseId = params.id as string;
    const locale = useLocale();
    const supabase = createClient();

    const [course, setCourse] = useState<any>(null);
    const [enrolled, setEnrolled] = useState<any[]>([]);
    const [available, setAvailable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: courseData }, { data: enrolledData }, { data: allStudents }] = await Promise.all([
            supabase.from('courses').select('id, name').eq('id', courseId).single(),
            (supabase as any)
                .from('course_students')
                .select('id, student_id, created_at, students(id, full_name, phone, parent_phone, date_of_birth)')
                .eq('course_id', courseId)
                .order('created_at', { ascending: true }),
            (supabase as any)
                .from('students')
                .select('id, full_name, phone')
                .order('full_name'),
        ]);
        setCourse(courseData);
        const enrolledRows = enrolledData || [];
        setEnrolled(enrolledRows);
        const enrolledIds = new Set(enrolledRows.map((r: any) => r.student_id));
        setAvailable((allStudents || []).filter((s: any) => !enrolledIds.has(s.id)));
        setLoading(false);
    }, [courseId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredAvailable = available.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) { toast.error('Please select a student'); return; }
        setAdding(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAdding(false); return; }

        const { error } = await (supabase as any).from('course_students').insert({
            course_id: courseId,
            student_id: selectedStudentId,
            created_by: user.id,
        });

        if (error) toast.error(error.message);
        else { toast.success('Student enrolled!'); setSelectedStudentId(''); setSearch(''); fetchData(); }
        setAdding(false);
    };

    const handleRemove = async (enrollmentId: string, studentName: string) => {
        if (!confirm(`Remove "${studentName}" from this course?`)) return;
        const { error } = await (supabase as any).from('course_students').delete().eq('id', enrollmentId);
        if (error) toast.error(error.message);
        else { toast.success('Student removed'); fetchData(); }
    };

    const formatDob = (dob: string | null) => {
        if (!dob) return null;
        const d = new Date(dob);
        const age = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        return `${age} yrs`;
    };

    if (loading) return <div className="page-container flex items-center justify-center"><p className="text-white/70 text-lg">Loading...</p></div>;

    const inputClass = "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";

    return (
        <div className="page-container">
            <div className="max-w-3xl mx-auto">
                <Link href={`/${locale}/admin/courses`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">← Back to Courses</Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Students — {course?.name}</h1>
                    <p className="text-white/70">{enrolled.length} student{enrolled.length !== 1 ? 's' : ''} enrolled</p>
                </div>

                {/* Enroll existing student */}
                <GlassCard className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Enroll Student</h2>
                    {available.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-white/50 text-sm mb-3">All registered students are already enrolled in this course.</p>
                            <Link href={`/${locale}/admin/students/new`} className="text-primary hover:text-white text-sm transition-colors">
                                + Register a new student
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleAdd} className="space-y-3">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setSelectedStudentId(''); }}
                                placeholder="Search students..."
                                className={`w-full ${inputClass}`}
                            />
                            {search && filteredAvailable.length > 0 && (
                                <div className="bg-white/5 rounded-lg border border-white/10 max-h-48 overflow-y-auto">
                                    {filteredAvailable.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => { setSelectedStudentId(s.id); setSearch(s.full_name); }}
                                            className={`w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors flex items-center justify-between ${selectedStudentId === s.id ? 'bg-primary/20 text-white' : 'text-white/80'}`}
                                        >
                                            <span>{s.full_name}</span>
                                            {s.phone && <span className="text-white/40 text-xs">{s.phone}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {search && filteredAvailable.length === 0 && (
                                <p className="text-white/40 text-sm px-1">No matching students found. <Link href={`/${locale}/admin/students/new`} className="text-primary hover:text-white transition-colors">Register new</Link></p>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button type="submit" disabled={adding || !selectedStudentId} className="btn-glossy disabled:opacity-50">
                                    {adding ? 'Enrolling...' : 'Enroll'}
                                </button>
                                {selectedStudentId && (
                                    <button type="button" onClick={() => { setSelectedStudentId(''); setSearch(''); }} className="text-white/50 hover:text-white text-sm transition-colors px-2">
                                        Clear
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </GlassCard>

                {/* Enrolled students list */}
                {enrolled.length === 0 ? (
                    <GlassCard><p className="text-white/70 text-center py-12">No students enrolled yet</p></GlassCard>
                ) : (
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-white mb-4">Enrolled Students</h2>
                        <div className="space-y-2">
                            {enrolled.map((e: any, idx) => {
                                const s = e.students;
                                return (
                                    <div key={e.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                                        <span className="text-white/40 text-sm w-6 text-right shrink-0">{idx + 1}.</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-white font-medium">{s?.full_name || '—'}</span>
                                                {s?.date_of_birth && (
                                                    <span className="text-white/40 text-xs">{formatDob(s.date_of_birth)}</span>
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-0.5 flex-wrap">
                                                {s?.phone && <span className="text-white/50 text-xs">📞 {s.phone}</span>}
                                                {s?.parent_phone && <span className="text-white/50 text-xs">👨‍👩‍👧 {s.parent_phone}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <Link
                                                href={`/${locale}/admin/students/${s?.id}/edit`}
                                                className="text-primary hover:text-white text-sm transition-colors"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleRemove(e.id, s?.full_name)}
                                                className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
