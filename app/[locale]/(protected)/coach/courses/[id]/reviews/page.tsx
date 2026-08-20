'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { LuxuryLoader } from '@/components/ui/LuxuryLoader';
import { Star, Calendar, MessageSquare, ChevronLeft, ChevronDown, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Review {
    id: string;
    rating: number;
    title: string;
    review_text: string | null;
    responses: Record<string, unknown>;
    reviewer_name: string | null;
    created_at: string;
}

interface CourseInfo {
    id: string;
    name: string;
}

export default function CoachCourseReviewsPage() {
    const params = useParams();
    const courseId = params.id as string;
    const locale = useLocale();
    const t = useTranslations('pages.courses');
    const supabase = createClient();

    const [course, setCourse] = useState<CourseInfo | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, average: 0 });
    const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchData();
    }, [courseId]);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const [{ data: courseData }, { data: reviewData }] = await Promise.all([
            supabase.from('courses').select('id, name').eq('id', courseId).single(),
            supabase
                .from('course_reviews')
                .select('*')
                .eq('course_id', courseId)
                .eq('coach_id', user.id)
                .order('created_at', { ascending: false }),
        ]);

        setCourse(courseData);
        const reviewsList = (reviewData || []) as Review[];
        setReviews(reviewsList);

        const total = reviewsList.length;
        const average = total > 0
            ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / total
            : 0;
        setStats({ total, average: Math.round(average * 10) / 10 });
        setLoading(false);
    };

    const renderStars = (rating: number) =>
        Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={18}
                className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
            />
        ));

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    const formatTime = (dateString: string) =>
        new Date(dateString).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
        });

    const ratingLabel = (rating: number) => {
        if (rating >= 4.5) return t('ratingExcellent');
        if (rating >= 3.5) return t('ratingVeryGood');
        if (rating >= 2.5) return t('ratingGood');
        return t('ratingNeedsImprovement');
    };

    const ratingColor = (rating: number) => {
        if (rating >= 4) return 'text-green-400';
        if (rating >= 3) return 'text-yellow-400';
        return 'text-red-400';
    };

    const formatQuestionKey = (key: string) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    const toggleResponse = (reviewId: string, key: string) => {
        const id = `${reviewId}-${key}`;
        setExpandedResponses(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAllResponses = (reviewId: string, keys: string[]) => {
        const ids = keys.map(key => `${reviewId}-${key}`);
        const allExpanded = ids.every(id => expandedResponses.has(id));
        setExpandedResponses(prev => {
            const next = new Set(prev);
            if (allExpanded) {
                ids.forEach(id => next.delete(id));
            } else {
                ids.forEach(id => next.add(id));
            }
            return next;
        });
    };

    if (loading) return <LuxuryLoader />;

    return (
        <div className="page-container">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link
                        href={`/${locale}/coach/courses`}
                        className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-4 transition-colors"
                    >
                        <ChevronLeft size={16} />
                        {t('title')}
                    </Link>
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                        {t('reviews')} — {course?.name}
                    </h1>
                    <p className="text-white/70">{t('courseReviewsDetail')}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <GlassCard>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <Star className="text-primary" size={24} />
                            </div>
                            <div>
                                <p className="text-white/50 text-xs">{t('averageRating') || 'Average Rating'}</p>
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
                                <p className="text-white/50 text-xs">{t('totalReviews') || 'Total Reviews'}</p>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                            </div>
                        </div>
                    </GlassCard>
                    <GlassCard>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                stats.average >= 4 ? 'bg-green-500/20' : stats.average >= 3 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                            }`}>
                                <span className="text-2xl">{stats.average >= 4 ? '😊' : stats.average >= 3 ? '😐' : '😞'}</span>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs">{t('overallRating')}</p>
                                <p className={`text-lg font-bold ${ratingColor(stats.average)}`}>{ratingLabel(stats.average)}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Reviews */}
                {reviews.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-16">
                            <FileText className="mx-auto text-white/20 mb-4" size={56} />
                            <p className="text-white/60 text-lg mb-2">{t('noReviews') || 'No reviews yet'}</p>
                            <p className="text-white/40 text-sm">{t('noReviewsForCourse')}</p>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review, index) => {
                            const responseEntries = review.responses
                                ? Object.entries(review.responses).filter(([key, v]) => {
                                    if (!v || !String(v).trim()) return false;
                                    const lowerKey = key.toLowerCase();
                                    if (lowerKey.includes('id') && String(v).includes('-')) return false;
                                    if (lowerKey === 'coachid' || lowerKey === 'courseid') return false;
                                    return true;
                                })
                                : [];

                            return (
                                <GlassCard key={review.id} delay={index * 0.05}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                                                <span className={`text-sm font-bold ${ratingColor(review.rating)}`}>
                                                    {review.rating}/5
                                                </span>
                                            </div>
                                            <h3 className="text-white font-semibold text-base">{review.title}</h3>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-white/50 text-xs shrink-0">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatDate(review.created_at)}
                                            </div>
                                            <span>{formatTime(review.created_at)}</span>
                                        </div>
                                    </div>

                                    {review.review_text && (
                                        <p className="text-white/75 text-sm leading-relaxed mb-3 whitespace-pre-line">
                                            {review.review_text}
                                        </p>
                                    )}

                                    {/* Responses */}
                                    {responseEntries.length > 0 && (
                                        <div className="border-t border-white/10 pt-3 mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-white/50 text-xs font-medium">{t('responsesLabel') || 'Responses'}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAllResponses(review.id, responseEntries.map(([k]) => k))}
                                                    className="text-primary/70 hover:text-primary text-xs font-medium transition-colors"
                                                    aria-expanded={responseEntries.every(([k]) => expandedResponses.has(`${review.id}-${k}`))}
                                                >
                                                    {responseEntries.every(([k]) => expandedResponses.has(`${review.id}-${k}`))
                                                        ? t('collapseAll') || 'Collapse All'
                                                        : t('expandAll') || 'Expand All'}
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {responseEntries.map(([key, value]) => {
                                                    const isExpanded = expandedResponses.has(`${review.id}-${key}`);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="bg-white/[0.05] border border-white/10 rounded-lg overflow-hidden"
                                                        >
                                                            <button
                                                                type="button"
                                                                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
                                                                onClick={() => toggleResponse(review.id, key)}
                                                                aria-expanded={isExpanded}
                                                            >
                                                                <p className="text-primary text-xs font-medium">{formatQuestionKey(key)}</p>
                                                                <ChevronDown
                                                                    size={14}
                                                                    className={`text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                />
                                                            </button>
                                                            <AnimatePresence initial={false}>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                                    >
                                                                        <div className="px-3 pb-2">
                                                                            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">{String(value)}</p>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
