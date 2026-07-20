import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/layout/GlassCard';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CoachMyCoursesPage() {
    const supabase = await createClient();
    const locale = await getLocale();
    const t = await getTranslations('pages.courses');
    const tc = await getTranslations('common');

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
    let reviewsByCourse: Record<string, any[]> = {};

    if (courseIds.length > 0) {
        // Step 2: fetch full course details — separate query avoids nested RLS issues
        const { data: courseData } = await supabase
            .from('courses')
            .select('id, name, description, status')
            .in('id', courseIds)
            .order('name');

        courses = courseData || [];

        // Step 3: fetch students for those courses — use two-step approach for RLS compatibility
        const { data: enrollmentData } = await supabase
            .from('course_students')
            .select('id, course_id, student_id')
            .in('course_id', courseIds);

        const studentIds = (enrollmentData || [])
            .map((e: any) => e.student_id)
            .filter(Boolean);

        let studentMap: Record<string, any> = {};
        if (studentIds.length > 0) {
            const { data: studentDetails } = await supabase
                .from('students')
                .select('id, full_name')
                .in('id', studentIds);

            (studentDetails || []).forEach((s: any) => {
                studentMap[s.id] = s;
            });
        }

        // Attach students to courses
        const studentsByCourse: Record<string, any[]> = {};
        (enrollmentData || []).forEach((e: any) => {
            if (!studentsByCourse[e.course_id]) studentsByCourse[e.course_id] = [];
            const student = studentMap[e.student_id] || {};
            studentsByCourse[e.course_id].push({
                id: e.student_id,
                student_name: student.full_name || 'Unknown student',
            });
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

        const { data: reviewData } = await supabase
            .from('course_reviews')
            .select('id, course_id, rating, review_text, created_at')
            .eq('coach_id', user.id)
            .in('course_id', courseIds)
            .order('created_at', { ascending: false })
            .limit(20);
        (reviewData || []).forEach((review: any) => {
            if (!reviewsByCourse[review.course_id]) reviewsByCourse[review.course_id] = [];
            reviewsByCourse[review.course_id].push(review);
        });
    }

    return (
        <div className="page-container">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('title')}</h1>
                    <p className="text-white/70">{courses.length} course{courses.length !== 1 ? 's' : ''} assigned to you</p>
                </div>

                {courses.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 mb-2">{tc('noCoursesAssigned')}</p>
                            <p className="text-white/50 text-sm">Contact your admin to be assigned to a course.</p>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="space-y-6">
                        {courses.map((course: any) => {
                            const students = course.course_students || [];
                            const currentRate = ratesByCourse[course.id] ?? null;
                            const canLog = course.status === 'active';
                            const reviews = reviewsByCourse[course.id] || [];
                            const averageRating = reviews.length ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1) : null;

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
                                                    {t('logSession') || '+ Log Session'}
                                                </Link>
                                            ) : (
                                                <span className="text-white/30 text-xs">{tc('archived')}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4 mt-4">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <p className="text-white/50 text-xs uppercase font-semibold tracking-wider">Parent feedback</p>
                                            {averageRating ? <span className="text-amber-300 text-sm font-semibold">★ {averageRating}/5 · {reviews.length}</span> : <span className="text-white/40 text-sm">No feedback yet</span>}
                                        </div>
                                        {reviews.length > 0 && <div className="space-y-2">{reviews.slice(0, 3).map((review) => (
                                            <div key={review.id} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
                                                <p className="text-amber-300 text-xs mb-1">★ {review.rating}/5</p>
                                                {review.review_text && <p className="text-white/75 text-sm whitespace-pre-line line-clamp-3">{review.review_text}</p>}
                                            </div>
                                        ))}</div>}
                                    </div>

                                    {/* Students */}
                                    <div className="border-t border-white/10 pt-4">
                                        <p className="text-white/50 text-xs uppercase font-semibold tracking-wider mb-3">
                                            {students.length} Student{students.length !== 1 ? 's' : ''}
                                        </p>
                                        {students.length === 0 ? (
                                            <p className="text-white/40 text-sm italic">No students enrolled yet</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                {students.map((s: any, idx: number) => (
                                                    <div
                                                        key={s.id}
                                                        className="bg-white/[0.07] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/90 flex items-center gap-2"
                                                        title={s.student_name}
                                                    >
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs font-semibold flex-shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="leading-5 break-words">
                                                            {s.student_name}
                                                        </span>
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
