'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function AdminStudentsPage() {
    const locale = useLocale();
    const t = useTranslations('pages.students');
    const tc = useTranslations('common');
    const supabase = createClient();
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [courseFilter, setCourseFilter] = useState('');      // course id
    const [courseSearch, setCourseSearch] = useState('');       // free-text course name search
    const [ageMin, setAgeMin] = useState('');
    const [ageMax, setAgeMax] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: studentsData, error }, { data: coursesData }] = await Promise.all([
            (supabase as any)
                .from('students')
                .select('id, full_name, date_of_birth, phone, parent_phone, notes, course_students(course_id, courses(id, name))')
                .order('full_name'),
            supabase.from('courses').select('id, name').order('name'),
        ]);
        if (error) toast.error(error.message);
        setAllStudents(studentsData || []);
        setCourses(coursesData || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getAge = (dob: string | null) => {
        if (!dob) return null;
        return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    };

    const formatDob = (dob: string | null) => {
        if (!dob) return '—';
        const age = getAge(dob);
        return `${new Date(dob).toLocaleDateString('en-GB')} (${age} yrs)`;
    };

    // Unique course "families" — the first word of the course name, e.g. "Python" from "Python gf1"
    const courseFamilies = useMemo(() => {
        const families = new Set<string>();
        courses.forEach(c => {
            const first = c.name.split(' ')[0];
            if (first) families.add(first.toLowerCase());
        });
        return Array.from(families).sort();
    }, [courses]);

    const filtered = useMemo(() => {
        return allStudents.filter(s => {
            // Name search
            if (search.trim() && !s.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false;

            // Specific course by id
            if (courseFilter) {
                const enrolled = (s.course_students || []).some((cs: any) => cs.course_id === courseFilter);
                if (!enrolled) return false;
            }

            // Free-text course name search (e.g. "python" matches "Python gf1", "Python gf3")
            if (courseSearch.trim()) {
                const term = courseSearch.trim().toLowerCase();
                const enrolled = (s.course_students || []).some((cs: any) =>
                    cs.courses?.name?.toLowerCase().includes(term)
                );
                if (!enrolled) return false;
            }

            // Age filters
            const age = getAge(s.date_of_birth);
            if (ageMin !== '' && (age === null || age < Number(ageMin))) return false;
            if (ageMax !== '' && (age === null || age > Number(ageMax))) return false;

            return true;
        });
    }, [allStudents, search, courseFilter, courseSearch, ageMin, ageMax]);

    const hasFilters = search || courseFilter || courseSearch || ageMin || ageMax;

    const clearFilters = () => {
        setSearch('');
        setCourseFilter('');
        setCourseSearch('');
        setAgeMin('');
        setAgeMax('');
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('deleteConfirm').replace('%name%', name))) return;
        const { error } = await (supabase as any).from('students').delete().eq('id', id);
        if (error) toast.error(error.message);
        else { toast.success(t('studentDeleted')); fetchData(); }
    };

    const inputClass = "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm";

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('title')}</h1>
                        <p className="text-white/70">
                            {loading ? '…' : `${filtered.length} / ${allStudents.length}`}
                        </p>
                    </div>
                    <Link href={`/${locale}/admin/students/new`} className="btn-glossy">
                        {t('addNew')}
                    </Link>
                </div>

                {/* Filters */}
                <GlassCard className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Name search */}
                        <div>
                            <label className="block text-white/50 text-xs mb-1">{t('searchByName')}</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="e.g. Ahmed"
                                className={`w-full ${inputClass}`}
                            />
                        </div>

                        {/* Course family free-text */}
                        <div>
                            <label className="block text-white/50 text-xs mb-1">{t('courseContains')}</label>
                            <input
                                type="text"
                                value={courseSearch}
                                onChange={(e) => { setCourseSearch(e.target.value); setCourseFilter(''); }}
                                placeholder="e.g. Python"
                                className={`w-full ${inputClass}`}
                                list="course-families"
                            />
                            <datalist id="course-families">
                                {courseFamilies.map(f => <option key={f} value={f} />)}
                            </datalist>
                        </div>

                        {/* Specific course dropdown */}
                        <div>
                            <label className="block text-white/50 text-xs mb-1">{t('specificCourse')}</label>
                            <select
                                value={courseFilter}
                                onChange={(e) => { setCourseFilter(e.target.value); setCourseSearch(''); }}
                                className="w-full bg-gray-900 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                                <option value="" className="bg-gray-900 text-white">{t('allCoursesOption')}</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id} className="bg-gray-900 text-white">{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Age range */}
                        <div>
                            <label className="block text-white/50 text-xs mb-1">{t('ageRange')}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={ageMin}
                                    onChange={(e) => setAgeMin(e.target.value)}
                                    placeholder={t('ageMin')}
                                    min={0}
                                    className={`w-full ${inputClass}`}
                                />
                                <span className="text-white/40 shrink-0">–</span>
                                <input
                                    type="number"
                                    value={ageMax}
                                    onChange={(e) => setAgeMax(e.target.value)}
                                    placeholder={t('ageMax')}
                                    min={0}
                                    className={`w-full ${inputClass}`}
                                />
                            </div>
                        </div>
                    </div>

                    {hasFilters && (
                        <button onClick={clearFilters} className="mt-3 text-white/40 hover:text-white text-xs transition-colors">
                            {tc('clearFilters')}
                        </button>
                    )}
                </GlassCard>

                {loading ? (
                    <GlassCard><p className="text-white/70 text-center py-12">Loading...</p></GlassCard>
                ) : filtered.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-4">{hasFilters ? t('noMatchFilters') : t('noStudentsYet')}</p>
                            {hasFilters ? (
                                <button onClick={clearFilters} className="text-primary hover:text-white text-sm transition-colors">{tc('clearFilters')}</button>
                            ) : (
                                <Link href={`/${locale}/admin/students/new`} className="btn-glossy inline-block">{t('addFirst')}</Link>
                            )}
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-white/70 text-sm">{t('numCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70 text-sm">{t('nameCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70 text-sm">{t('ageCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70 text-sm">{t('phoneCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70 text-sm">{t('parentPhoneCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70 text-sm">{t('coursesCol')}</th>
                                        <th className="text-right py-3 px-4 text-white/70 text-sm">{t('actionsCol')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s, idx) => {
                                        const enrolledCourses: string[] = (s.course_students || [])
                                            .map((cs: any) => cs.courses?.name)
                                            .filter(Boolean);
                                        return (
                                            <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 text-white/40 text-sm">{idx + 1}</td>
                                                <td className="py-3 px-4 text-white font-medium">{s.full_name}</td>
                                                <td className="py-3 px-4 text-white/70 text-sm">{formatDob(s.date_of_birth)}</td>
                                                <td className="py-3 px-4 text-white/70 text-sm">{s.phone || '—'}</td>
                                                <td className="py-3 px-4 text-white/70 text-sm">{s.parent_phone || '—'}</td>
                                                <td className="py-3 px-4">
                                                    {enrolledCourses.length === 0 ? (
                                                        <span className="text-white/30 text-sm">—</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {enrolledCourses.map((name, i) => (
                                                                <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <Link
                                                            href={`/${locale}/admin/students/${s.id}/edit`}
                                                            className="text-primary hover:text-white text-sm transition-colors"
                                                        >
                                                            {tc('edit')}
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(s.id, s.full_name)}
                                                            className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                                        >
                                                            {tc('delete')}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
