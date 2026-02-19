'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

export default function NewStudentPage() {
    const router = useRouter();
    const { locale } = useParams() as { locale: string };
    const supabase = createClient();

    const [form, setForm] = useState({
        full_name: '',
        date_of_birth: '',
        phone: '',
        parent_phone: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [duplicates, setDuplicates] = useState<any[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.name === 'full_name') setDuplicates([]);
    };

    const checkDuplicates = async () => {
        const name = form.full_name.trim();
        if (!name) return;
        const { data } = await (supabase as any)
            .from('students')
            .select('id, full_name, phone, date_of_birth')
            .ilike('full_name', name);
        setDuplicates(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name.trim()) { toast.error('Name is required'); return; }

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        const payload: any = {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            parent_phone: form.parent_phone.trim() || null,
            notes: form.notes.trim() || null,
            created_by: user?.id,
        };
        if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;

        const { error } = await (supabase as any).from('students').insert(payload);
        setSaving(false);

        if (error) { toast.error(error.message); return; }
        toast.success('Student created!');
        router.push(`/${locale}/admin/students`);
    };

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <button onClick={() => router.back()} className="text-white/50 hover:text-white text-sm mb-4 transition-colors">
                        ← Back
                    </button>
                    <h1 className="text-2xl md:text-4xl font-bold text-white">New Student</h1>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-white/70 mb-1 text-sm">Full Name <span className="text-red-400">*</span></label>
                            <input
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                onBlur={checkDuplicates}
                                required
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Student's full name"
                            />
                            {duplicates.length > 0 && (
                                <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
                                    <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ A student with this name already exists:</p>
                                    {duplicates.map((d: any) => (
                                        <div key={d.id} className="text-yellow-300/80 text-xs flex items-center gap-3">
                                            <span>{d.full_name}</span>
                                            {d.phone && <span>📞 {d.phone}</span>}
                                            {d.date_of_birth && <span>🎂 {new Date(d.date_of_birth).toLocaleDateString('en-GB')}</span>}
                                        </div>
                                    ))}
                                    <p className="text-yellow-400/60 text-xs mt-2">You can still save if this is a different person.</p>
                                </div>
                            )}
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
                                placeholder="Any additional notes..."
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving} className="btn-glossy flex-1 disabled:opacity-50">
                                {saving ? 'Saving...' : 'Create Student'}
                            </button>
                            <button type="button" onClick={() => router.back()} className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
