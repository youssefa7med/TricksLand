import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/layout/GlassCard';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CoachMyCoursesPage() {
    const supabase = await createClient();
    const locale = await getLocale();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Step 1: get the course IDs this coach is assigned to
    const { data: assignments } = await supabase
        .from('course_coaches')
        .select('course_id')
        .eq('coach_id', user.id);

    const courseIds = (assignments || []).map((a: any) => a.course_id).filter(Boolean);

    let courses: any[] = [];
    let ratesByCourse: Record<string, number | null> = {};

    if (courseIds.length > 0) {
        // Step 2: fetch full course details — separate query avoids nested RLS issues
        const { data: courseData } = await supabase
            .from('courses')
            .select('id, name, description, status')
            .in('id', courseIds)
            .order('name');

        courses = courseData || [];

        // Step 3: fetch students for those courses
        const { data: studentData } = await supabase
            .from('course_students')
            .select('id, course_id, student_name')
            .in('course_id', courseIds)
            .order('student_name');

        // Attach students to courses
        const studentsByCourse: Record<string, any[]> = {};
        (studentData || []).forEach((s: any) => {
            if (!studentsByCourse[s.course_id]) studentsByCourse[s.course_id] = [];
            studentsByCourse[s.course_id].push(s);
        });
        courses = courses.map((c: any) => ({
            ...c,
            course_students: studentsByCourse[c.id] || [],
        }));

        // Step 4: fetch hourly rates
        const { data: rateData } = await supabase
            .from('hourly_rates')
            .select('course_id, rate, effective_from')
            .eq('coach_id', user.id)
            .in('course_id', courseIds)
            .order('effective_from', { ascending: false });

        (rateData || []).forEach((r: any) => {
            if (!(r.course_id in ratesByCourse)) {
                ratesByCourse[r.course_id] = r.rate;
            }
        });
    }

    return (
        <div className="page-container">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">My Courses</h1>
                    <p className="text-white/70">{courses.length} course{courses.length !== 1 ? 's' : ''} assigned to you</p>
                </div>

                {courses.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-2">You are not assigned to any courses yet.</p>
                            <p className="text-white/50 text-sm">Contact your admin to be assigned to a course.</p>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="space-y-6">
                        {courses.map((course: any) => {
                            const students = course.course_students || [];
                            const currentRate = ratesByCourse[course.id] ?? null;
                            const canLog = course.status === 'active';

                            return (
                                <GlassCard key={course.id}>
                                    {/* Header row */}
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                                <h2 className="text-2xl font-semibold text-white">{course.name}</h2>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    course.status === 'active'
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : 'bg-gray-500/20 text-gray-300'
                                                }`}>
                                                    {course.status}
                                                </span>
                                            </div>
                                            {course.description && (
                                                <p className="text-white/60 text-sm">{course.description}</p>
                                            )}
                                        </div>

                                        {/* Rate badge + Log Session button */}
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            {currentRate !== null ? (
                                                <div className="text-right">
                                                    <p className="text-white/40 text-xs">Your rate</p>
                                                    <p className="text-primary font-bold text-lg">{currentRate} EGP/hr</p>
                                                </div>
                                            ) : (
                                                <p className="text-yellow-400/70 text-xs">No rate set yet</p>
                                            )}

                                            {canLog ? (
                                                <Link
                                                    href={`/${locale}/coach/sessions/new?course_id=${course.id}`}
                                                    className="btn-glossy text-sm whitespace-nowrap"
                                                >
                                                    + Log Session
                                                </Link>
                                            ) : (
                                                <span className="text-white/30 text-xs">Course archived</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Students */}
                                    <div className="border-t border-white/10 pt-4">
                                        <p className="text-white/50 text-xs uppercase font-semibold tracking-wider mb-3">
                                            {students.length} Student{students.length !== 1 ? 's' : ''}
                                        </p>
                                        {students.length === 0 ? (
                                            <p className="text-white/40 text-sm italic">No students enrolled yet</p>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {students.map((s: any, idx: number) => (
                                                    <div key={s.id} className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80">
                                                        <span className="text-white/40 mr-2">{idx + 1}.</span>
                                                        {s.student_name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
