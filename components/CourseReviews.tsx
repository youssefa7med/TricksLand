'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { AnimatedDropdown } from '@/components/ui/animated-dropdown';
import { ReviewDetailsModal } from '@/components/ReviewDetailsModal';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Star, User, Calendar, Clock, MessageSquare, Filter, X, ChevronRight } from 'lucide-react';

interface CourseReview {
    id: string;
    course_id: string;
    coach_id: string;
    rating: number;
    title: string;
    review_text: string | null;
    responses: Record<string, unknown>;
    reviewer_name: string | null;
    created_at: string;
    profiles?: { full_name: string };
    courses?: { name: string };
}

interface CourseOption { id: string; name: string; }
interface CoachOption { id: string; full_name: string; }

interface CourseReviewsProps {
    courseId?: string;
    showAll?: boolean;
    showFilters?: boolean;
}

export function CourseReviews({ courseId, showAll = false, showFilters = false }: CourseReviewsProps) {
    const [reviews, setReviews] = useState<CourseReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, average: 0 });
    const [filterCourse, setFilterCourse] = useState(courseId || '');
    const [filterCoach, setFilterCoach] = useState('');
    const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
    const [coachOptions, setCoachOptions] = useState<CoachOption[]>([]);
    const [selectedReview, setSelectedReview] = useState<CourseReview | null>(null);
    const supabase = createClient();
    const t = useTranslations('pages.courses');

    useEffect(() => {
        if (showFilters) fetchFilterOptions();
    }, [showFilters]);

    useEffect(() => {
        fetchReviews();
    }, [courseId, filterCourse, filterCoach]);

    const fetchFilterOptions = async () => {
        const [{ data: courses }, { data: coaches }] = await Promise.all([
            supabase.from('courses').select('id, name').order('name'),
            supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
        ]);
        setCourseOptions((courses || []) as CourseOption[]);
        setCoachOptions((coaches || []) as CoachOption[]);
    };

    const fetchReviews = async () => {
        setLoading(true);
        let query = supabase
            .from('course_reviews')
            .select(`
                *,
                profiles!course_reviews_coach_id_fkey (full_name),
                courses!course_reviews_course_id_fkey (name)
            `)
            .order('created_at', { ascending: false });

        if (courseId && !showAll) {
            query = query.eq('course_id', courseId);
        } else if (filterCourse) {
            query = query.eq('course_id', filterCourse);
        }

        if (filterCoach) {
            query = query.eq('coach_id', filterCoach);
        }

        const { data, error } = await query;

        if (error) {
            toast.error(error.message);
        } else {
            setReviews(data || []);
            calculateStats(data || []);
        }
        setLoading(false);
    };

    const calculateStats = (reviewData: CourseReview[]) => {
        const total = reviewData.length;
        const average = total > 0
            ? reviewData.reduce((sum, r) => sum + r.rating, 0) / total
            : 0;
        setStats({ total, average: Math.round(average * 10) / 10 });
    };

    const clearFilters = () => {
        setFilterCourse('');
        setFilterCoach('');
    };

    const hasActiveFilters = filterCourse || filterCoach;

    const renderStars = (rating: number) =>
        Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={14}
                className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}
            />
        ));

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

    const formatTime = (dateString: string) =>
        new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

    const formatQuestionKey = (key: string) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    const getResponseCount = (review: CourseReview) => {
        if (!review.responses) return 0;
        return Object.entries(review.responses).filter(([key, v]) => {
            if (!v || !String(v).trim()) return false;
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('id') && String(v).includes('-')) return false;
            if (lowerKey === 'coachid' || lowerKey === 'courseid') return false;
            return true;
        }).length;
    };

    if (loading) {
        return (
            <GlassCard>
                <div className="text-center py-8">
                    <p className="text-white/70">{t('loadingReviews') || 'Loading reviews...'}</p>
                </div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            {showFilters && (
                <GlassCard>
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={16} className="text-primary" />
                        <p className="text-white/80 text-sm font-semibold">{t('filterReviews') || 'Filter Reviews'}</p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mr-auto text-white/50 hover:text-white text-xs flex items-center gap-1 transition-colors"
                            >
                                <X size={12} />
                                {t('clearFilters') || 'Clear'}
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-white/50 text-xs mb-2 block font-medium">{t('title') || 'Course'}</label>
                            <AnimatedDropdown
                                trigger={filterCourse ? courseOptions.find(c => c.id === filterCourse)?.name || t('allCourses') || 'All Courses' : t('allCourses') || 'All Courses'}
                                selectedValue={filterCourse}
                                items={[
                                    { label: t('allCourses') || 'All Courses', value: '' },
                                    ...courseOptions.map(c => ({ label: c.name, value: c.id })),
                                ]}
                                onSelect={(value) => setFilterCourse(value)}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-white/50 text-xs mb-2 block font-medium">{t('coachesLabel') || 'Coach'}</label>
                            <AnimatedDropdown
                                trigger={filterCoach ? coachOptions.find(c => c.id === filterCoach)?.full_name || t('allCoaches') || 'All Coaches' : t('allCoaches') || 'All Coaches'}
                                selectedValue={filterCoach}
                                items={[
                                    { label: t('allCoaches') || 'All Coaches', value: '' },
                                    ...coachOptions.map(c => ({ label: c.full_name, value: c.id })),
                                ]}
                                onSelect={(value) => setFilterCoach(value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <GlassCard>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <Star className="text-primary" size={24} />
                        </div>
                        <div>
                            <p className="text-white/60 text-sm">{t('averageRating') || 'Average Rating'}</p>
                            <p className="text-2xl font-bold text-white">{stats.average}</p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                            <MessageSquare className="text-secondary" size={24} />
                        </div>
                        <div>
                            <p className="text-white/60 text-sm">{t('totalReviews') || 'Total Reviews'}</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Reviews */}
            {reviews.length === 0 ? (
                <GlassCard>
                    <div className="text-center py-12">
                        <MessageSquare className="mx-auto text-white/30 mb-4" size={48} />
                        <p className="text-white/70">{t('noReviews') || 'No reviews yet'}</p>
                    </div>
                </GlassCard>
            ) : (
                <div className="space-y-3">
                    {reviews.map((review, index) => (
                        <GlassCard
                            key={review.id}
                            delay={index * 0.05}
                            hover
                            className="cursor-pointer !p-4"
                            onClick={() => setSelectedReview(review)}
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Left: Rating + Title + Meta */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                                        <span className="text-white/60 text-sm">({review.rating}/5)</span>
                                    </div>
                                    <h3 className="text-white font-semibold text-sm truncate">{review.title}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-white/40">
                                        {review.reviewer_name && (
                                            <span className="flex items-center gap-1">
                                                <User size={10} />
                                                {review.reviewer_name}
                                            </span>
                                        )}
                                        {review.profiles?.full_name && (
                                            <span className="flex items-center gap-1">
                                                <span className="text-primary">Coach:</span>
                                                {review.profiles.full_name}
                                            </span>
                                        )}
                                        {showAll && review.courses?.name && (
                                            <span className="flex items-center gap-1">
                                                <span className="text-secondary">Course:</span>
                                                {review.courses.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Date + Arrow */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="hidden sm:flex flex-col items-end gap-0.5 text-white/40 text-xs">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={11} />
                                            {formatDate(review.created_at)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {formatTime(review.created_at)}
                                        </div>
                                    </div>
                                    {getResponseCount(review) > 0 && (
                                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                            {getResponseCount(review)} {t('questionsLabel') || 'Q&A'}
                                        </span>
                                    )}
                                    <ChevronRight size={16} className="text-white/30" />
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Review Details Modal */}
            <ReviewDetailsModal
                review={selectedReview}
                isOpen={!!selectedReview}
                onClose={() => setSelectedReview(null)}
                formatQuestionKey={formatQuestionKey}
                formatDate={formatDate}
                formatTime={formatTime}
                showCoach
                showCourse={showAll}
            />
        </div>
    );
}
