'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

const STATUS_LABEL: Record<string, string> = {
    active: 'Active Courses',
    completed: 'Completed Courses',
    archived: 'Archived Courses',
};
const STATUS_COLOR: Record<string, string> = {
    active: 'text-green-400',
    completed: 'text-blue-400',
    archived: 'text-white/40',
};

export default function EditStudentPage() {
    const router = useRouter();
    const { locale, id } = useParams() as { locale: string; id: string };
    const supabase = createClient();

    const [form, setForm] = useState({
        full_name: '',
        date_of_birth: '',
        phone: '',
        parent_phone: '',
        notes: '',
    });
    const [allCourses, setAllCourses] = useState<any[]>([]);
    // course_id â†’ enrollment row id (for deletions)
    const [enrollmentMap, setEnrollmentMap] = useState<Record<string, string>>({});
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [{ data: student, error }, { data: enrollments }, { data: coursesData }] = await Promise.all([
                (supabase as any).from('students').select('*').eq('id', id).single(),
                (supabase as any)
                    .from('course_students')
                    .select('id, course_id')
                    .eq('student_id', id),
                (supabase as any)
                    .from('courses')
                    .select('id, name, status')
                    .order('status')
                    .order('name'),
            ]);

            if (error) { toast.error('Student not found'); router.back(); return; }
            const s = student as any;
            setForm({
                full_name: s.full_name || '',
                date_of_birth: s.date_of_birth || '',
                phone: s.phone || '',
                parent_phone: s.parent_phone || '',
                notes: s.notes || '',
            });

            // Build enrollment map and pre-checked set
            const eMap: Record<string, string> = {};
            const checkedIds = new Set<string>();
            for (const e of (enrollments || [])) {
                eMap[e.course_id] = e.id;
                checkedIds.add(e.course_id);
            }
            setEnrollmentMap(eMap);
            setSelectedCourseIds(checkedIds);
            setAllCourses(coursesData || []);
            setLoading(false);
        };
        load();
    }, [id]);

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev => {
            const next = new Set(prev);
            next.has(courseId) ? next.delete(courseId) : next.add(courseId);
            return next;
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();

        // Save basic profile
        const payload: any = {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            parent_phone: form.parent_phone.trim() || null,
            notes: form.notes.trim() || null,
            date_of_birth: form.date_of_birth || null,
            updated_at: new Date().toISOString(),
        };
        const { error } = await (supabase as any).from('students').update(payload).eq('id', id);
        if (error) { toast.error(error.message); setSaving(false); return; }

        // Sync enrollments: add new, remove unchecked
        const prevIds = new Set(Object.keys(enrollmentMap));
        const toAdd = [...selectedCourseIds].filter(cid => !prevIds.has(cid));
        const toRemove = [...prevIds].filter(cid => !selectedCourseIds.has(cid));

        const ops: Promise<any>[] = [
            ...toAdd.map(course_id =>
                (supabase as any).from('course_students').insert({ course_id, student_id: id, created_by: user?.id })
            ),
            ...toRemove.map(course_id =>
                (supabase as any).from('course_students').delete().eq('id', enrollmentMap[course_id])
            ),
        ];
        const results = await Promise.all(ops);
        const failed = results.filter((r: any) => r.error);
        if (failed.length) {
            toast.warning(`Saved, but ${failed.length} enrollment change(s) failed`);
        } else {
            toast.success('Student updated!');
        }

        setSaving(false);
        router.push(`/${locale}/admin/students`);
    };

    const handleDelete = async () => {
        if (!confirm(`Delete this student? They will be removed from all courses as well.`)) return;
        setDeleting(true);
        const { error } = await (supabase as any).from('students').delete().eq('id', id);
        setDeleting(false);
        if (error) { toast.error(error.message); return; }
        toast.success('Student deleted');
        router.push(`/${locale}/admin/students`);
    };

    // Group courses by status
    const grouped = allCourses.reduce((acc: Record<string, any[]>, c) => {
        const s = c.status || 'archived';
        if (!acc[s]) acc[s] = [];
        acc[s].push(c);
        return acc;
    }, {});
    const statusOrder = ['active', 'completed', 'archived'];

    if (loading) return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <GlassCard><p className="text-white/70 text-center py-12">Loading...</p></GlassCard>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <button onClick={() => router.back()} className="text-white/50 hover:text-white text-sm mb-4 transition-colors">
                        â† Back
                    </button>
                    <h1 className="text-2xl md:text-4xl font-bold text-white">Edit Student</h1>
                </div>

                {/* Form */}
                <GlassCard className="mb-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-white/70 mb-1 text-sm">Full Name <span className="text-red-400">*</span></label>
                            <input
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-white/70 mb-1 text-sm">Date of Birth</label>
                            <input
                                type="date"
                                name="date_of_birth"
                                value={form.date_of_birth}
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-white/70 mb-1 text-sm">Phone</label>
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Student's phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-white/70 mb-1 text-sm">Parent's Phone</label>
                            <input
                                name="parent_phone"
                                value={form.parent_phone}
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Parent/guardian phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-white/70 mb-1 text-sm">Notes</label>
                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                        </div>

                        {/* â”€â”€ Course Enrollments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-white font-semibold">Course Enrollments</h2>
                                <span className="text-xs text-white/40">{selectedCourseIds.size} selected</span>
                            </div>
                            <p className="text-white/40 text-xs mb-4">Check / uncheck courses to add or remove this student's enrollment.</p>

                            {allCourses.length === 0 ? (
                                <p className="text-white/30 text-sm">No courses available.</p>
                            ) : (
                                <div className="space-y-4">
                                    {statusOrder.map(status => {
                                        const group = grouped[status];
                                        if (!group || group.length === 0) return null;
                                        return (
                                            <div key={status}>
                                                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${STATUS_COLOR[status]}`}>
                                                    {STATUS_LABEL[status]} ({group.length})
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {group.map((c: any) => (
                                                        <label
                                                            key={c.id}
                                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors border ${
                                                                selectedCourseIds.has(c.id)
                                                                    ? 'bg-primary/15 border-primary/40'
                                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCourseIds.has(c.id)}
                                                                onChange={() => toggleCourse(c.id)}
                                                                className="w-4 h-4 accent-primary"
                                                            />
                                                            <span className="text-white text-sm">{c.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving} className="btn-glossy flex-1 disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" onClick={() => router.back()} className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </GlassCard>

                {/* Danger zone */}
                <GlassCard className="border border-red-500/20">
                    <h2 className="text-red-400 font-semibold text-lg mb-3">Danger Zone</h2>
                    <p className="text-white/50 text-sm mb-4">Deleting this student will remove them from all course enrollments permanently.</p>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : 'Delete Student'}
                    </button>
                </GlassCard>
            </div>
        </div>
    );
}
