'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

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
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [{ data: student, error }, { data: enrollments }] = await Promise.all([
                (supabase as any).from('students').select('*').eq('id', id).single(),
                supabase
                    .from('course_students' as any)
                    .select('created_at, courses(name, status)')
                    .eq('student_id', id)
                    .order('created_at', { ascending: false }),
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
            setCourses(enrollments || []);
            setLoading(false);
        };
        load();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);

        const payload: any = {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            parent_phone: form.parent_phone.trim() || null,
            notes: form.notes.trim() || null,
            date_of_birth: form.date_of_birth || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await (supabase as any).from('students').update(payload).eq('id', id);
        setSaving(false);

        if (error) { toast.error(error.message); return; }
        toast.success('Student updated!');
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
                        ← Back
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

                {/* Enrollment history */}
                <GlassCard className="mb-6">
                    <h2 className="text-white font-semibold text-lg mb-4">Course Enrollments ({courses.length})</h2>
                    {courses.length === 0 ? (
                        <p className="text-white/50 text-sm">Not enrolled in any courses.</p>
                    ) : (
                        <ul className="space-y-2">
                            {courses.map((c: any, i) => (
                                <li key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                                    <span className="text-white">{c.courses?.name || 'Unknown course'}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.courses?.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'}`}>
                                            {c.courses?.status || 'unknown'}
                                        </span>
                                        <span className="text-white/40 text-xs">
                                            {new Date(c.created_at).toLocaleDateString('en-GB')}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
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
