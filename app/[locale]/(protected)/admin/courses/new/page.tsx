'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { GlassCard } from '@/components/layout/GlassCard';
import Link from 'next/link';

interface Coach {
    id: string;
    full_name: string;
    email: string;
}

export default function NewCoursePage() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'active' | 'archived'>('active');
    const [hourlyRate, setHourlyRate] = useState('');
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'coach')
            .order('full_name')
            .then(({ data }) => setCoaches(data || []));
    }, []);

    const toggleCoach = (id: string) => {
        setSelectedCoaches((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Course name is required');
            return;
        }

        setLoading(true);
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('You must be logged in to create a course');
            setLoading(false);
            return;
        }

        const rate = hourlyRate ? parseFloat(hourlyRate) : null;
        if (hourlyRate && (isNaN(rate!) || rate! <= 0)) {
            toast.error('Hourly rate must be a positive number');
            setLoading(false);
            return;
        }

        const { data: course, error } = await (supabase as any)
            .from('courses')
            .insert({
                name: name.trim(),
                description: description.trim() || null,
                status,
                hourly_rate: rate,
                created_by: user.id,
            })
            .select('id')
            .single();

        if (error) {
            toast.error(error.message);
            setLoading(false);
            return;
        }

        // Assign selected coaches
        if (selectedCoaches.length > 0) {
            const assignments = selectedCoaches.map((coachId) => ({
                course_id: course.id,
                coach_id: coachId,
                assigned_by: user.id,
            }));
            const { error: assignError } = await (supabase as any).from('course_coaches').insert(assignments);
            if (assignError) {
                toast.error('Course created but coach assignment failed: ' + assignError.message);
            }
        }

        toast.success('Course created!');
        router.push(`/${locale}/admin/courses`);
        setLoading(false);
    };

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <Link href={`/${locale}/admin/courses`} className="text-white/60 hover:text-white transition-colors text-sm mb-8 block">
                    ← Back to Courses
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Create New Course</h1>
                    <p className="text-white/70">Add a new course to the academy</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Course Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Advanced Skateboarding Tricks"
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Description <span className="text-white/40">(optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what students will learn in this course..."
                                rows={3}
                                className={`${inputClass} resize-none`}
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Default Hourly Rate <span className="text-white/40">(optional, EGP/hr)</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                placeholder="e.g. 200"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'active' | 'archived')}
                                className={inputClass}
                            >
                                <option value="active" className="bg-gray-900">Active</option>
                                <option value="archived" className="bg-gray-900">Archived</option>
                            </select>
                        </div>

                        {/* Coach assignment */}
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Assign Coaches{' '}
                                <span className="text-white/40">(optional)</span>
                                {selectedCoaches.length > 0 && (
                                    <span className="ml-2 text-primary text-xs font-normal">
                                        {selectedCoaches.length} selected
                                    </span>
                                )}
                            </label>

                            {coaches.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-center">
                                    <p className="text-white/40 text-sm">No coaches available yet.</p>
                                    <p className="text-white/30 text-xs mt-1">
                                        Add coaches from the{' '}
                                        <Link href={`/${locale}/admin/coaches`} className="text-primary hover:underline">
                                            Coaches page
                                        </Link>{' '}
                                        first.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {coaches.map((coach) => {
                                        const checked = selectedCoaches.includes(coach.id);
                                        return (
                                            <label
                                                key={coach.id}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${
                                                    checked
                                                        ? 'bg-primary/20 border-primary/40'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCoach(coach.id)}
                                                    className="w-4 h-4 accent-primary flex-shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{coach.full_name}</p>
                                                    <p className="text-white/50 text-xs truncate">{coach.email}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-glossy disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Course'}
                            </button>
                            <Link
                                href={`/${locale}/admin/courses`}
                                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
