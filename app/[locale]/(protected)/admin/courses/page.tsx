'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import Link from 'next/link';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AdminCoursesPage() {
    const params = useParams();
    const locale = params.locale as string;
    const supabase = createClient();
    const t = useTranslations('pages.courses');
    const tc = useTranslations('common');
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = async () => {
        const { data, error } = await supabase
            .from('courses')
            .select(`
                id, name, description, status, hourly_rate, created_at,
                course_coaches (
                    id,
                    profiles!course_coaches_coach_id_fkey (full_name, email)
                ),
                course_students (count)
            `)
            .order('created_at', { ascending: false });

        if (error) toast.error(error.message);
        else setCourses(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchCourses(); }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('deleteConfirm').replace('%name%', name))) return;
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success(`Course "${name}" deleted`);
            fetchCourses();
        }
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <p className="text-white/70 text-lg">{t('loadingCourses')}</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('title')}</h1>
                        <p className="text-white/70">{t('subtitle')}</p>
                    </div>
                    <Link href={`/${locale}/admin/courses/new`} className="btn-glossy">
                        {t('createNew')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {courses.map((course: any) => (
                        <GlassCard key={course.id} hover>
                            <div className="flex justify-between items-start mb-4 gap-3">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xl font-semibold text-white mb-1 truncate">{course.name}</h2>
                                    {course.description && (
                                        <p className="text-white/60 text-sm line-clamp-2">{course.description}</p>
                                    )}
                                </div>
                                    <span className={`shrink-0 px-3 py-1 rounded text-sm ${
                                    course.status === 'active'
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-gray-500/20 text-gray-300'
                                }`}>
                                    {course.status === 'active' ? tc('active') : tc('archived')}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-start text-white/70 gap-2">
                                    <span className="text-sm font-medium shrink-0">{t('coachesLabel')}</span>
                                    {course.course_coaches?.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {course.course_coaches.map((cc: any) => (
                                                <span key={cc.id} className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded">
                                                    {cc.profiles?.full_name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-white/50">{t('noCoachesAssigned')}</span>
                                    )}
                                </div>

                                <div className="flex items-center text-white/70 gap-2">
                                    <span className="text-sm font-medium">{t('studentsLabel')}</span>
                                    <span className="text-sm">{course.course_students?.[0]?.count || 0} {t('enrolled')}</span>
                                </div>

                                {course.hourly_rate && (
                                    <div className="flex items-center text-white/70 gap-2">
                                        <span className="text-sm font-medium">{t('hourlyRate')}</span>
                                        <span className="text-sm text-primary font-semibold">{course.hourly_rate} EGP/hr</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
                                <Link
                                    href={`/${locale}/admin/courses/edit/${course.id}`}
                                    className="text-primary hover:text-white transition-colors text-sm font-medium"
                                >
                                    {tc('edit')}
                                </Link>
                                <Link
                                    href={`/${locale}/admin/courses/${course.id}/students`}
                                    className="text-secondary hover:text-white transition-colors text-sm font-medium"
                                >
                                    {tc('students')}
                                </Link>
                                <button
                                    onClick={() => handleDelete(course.id, course.name)}
                                    className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium ml-auto"
                                >
                                    {tc('delete')}
                                </button>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {courses.length === 0 && (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-4">{t('noCourses')}</p>
                            <Link href={`/${locale}/admin/courses/new`} className="btn-glossy inline-block">
                                {t('createFirst')}
                            </Link>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
