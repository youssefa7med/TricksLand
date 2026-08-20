'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { AnimatedDropdown } from '@/components/ui/animated-dropdown';
import { LuxuryLoader } from '@/components/ui/LuxuryLoader';
import { useLocale, useTranslations } from 'next-intl';
import { Star, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Link from 'next/link';

interface CourseOption { id: string; name: string; }
interface CoachOption { id: string; full_name: string; }
interface FormOptions { courses: CourseOption[]; coaches: CoachOption[]; }

export default function ReviewSubmissionPage() {
    const locale = useLocale();
    const t = useTranslations('pages.reviewForm');
    const supabase = createClient();

    const [options, setOptions] = useState<FormOptions>({ courses: [], coaches: [] });
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [courseId, setCourseId] = useState('');
    const [coachId, setCoachId] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [reviewerName, setReviewerName] = useState('');

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        setLoadingOptions(true);
        const { data, error } = await (supabase as any).rpc('get_course_review_form_options');
        if (error) {
            console.error(error);
        } else {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            setOptions({
                courses: parsed?.courses || [],
                coaches: parsed?.coaches || [],
            });
        }
        setLoadingOptions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!courseId) { toast.error(t('selectCourse')); return; }
        if (!coachId) { toast.error(t('selectCoach')); return; }
        if (rating === 0) { toast.error(t('selectRating')); return; }
        if (!title.trim()) { toast.error(t('enterTitle')); return; }

        setSubmitting(true);
        const { data, error } = await (supabase as any).rpc('submit_course_review', {
            p_course_id: courseId,
            p_coach_id: coachId,
            p_rating: rating,
            p_title: title.trim(),
            p_review_text: reviewText.trim() || null,
            p_reviewer_name: reviewerName.trim() || null,
        });

        if (error) {
            toast.error(error.message);
        } else {
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            if (result?.error) {
                toast.error(result.error);
            } else {
                setSubmitted(true);
            }
        }
        setSubmitting(false);
    };

    if (loadingOptions) return <LuxuryLoader label={t('loading')} />;

    if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <GlassCard className="w-full max-w-md text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <CheckCircle className="mx-auto text-green-400 mb-4" size={64} />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('thankYou')}</h2>
                    <p className="text-white/70 mb-6">{t('reviewSubmitted')}</p>
                    <Link
                        href={`/${locale}/reviews`}
                        className="btn-glossy inline-flex items-center gap-2"
                        onClick={() => {
                            setSubmitted(false);
                            setCourseId('');
                            setCoachId('');
                            setRating(0);
                            setTitle('');
                            setReviewText('');
                            setReviewerName('');
                        }}
                    >
                        {t('submitAnother')}
                    </Link>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <GlassCard className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <img
                        src="/images/tricksland-lux-logo.svg"
                        alt="TricksLand"
                        className="h-14 mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
                    <p className="text-white/60 text-sm">{t('subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Course */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">{t('course')} *</label>
                        <AnimatedDropdown
                            trigger={courseId ? options.courses.find(c => c.id === courseId)?.name || t('selectCourse') : t('selectCourse')}
                            selectedValue={courseId}
                            items={[
                                { label: t('selectCourse'), value: '' },
                                ...options.courses.map(c => ({ label: c.name, value: c.id })),
                            ]}
                            onSelect={setCourseId}
                            className="w-full"
                        />
                    </div>

                    {/* Coach */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">{t('coach')} *</label>
                        <AnimatedDropdown
                            trigger={coachId ? options.coaches.find(c => c.id === coachId)?.full_name || t('selectCoach') : t('selectCoach')}
                            selectedValue={coachId}
                            items={[
                                { label: t('selectCoach'), value: '' },
                                ...options.coaches.map(c => ({ label: c.full_name, value: c.id })),
                            ]}
                            onSelect={setCoachId}
                            className="w-full"
                        />
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">{t('rating')} *</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        size={32}
                                        className={
                                            star <= (hoverRating || rating)
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-white/30'
                                        }
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">{t('reviewTitle')} *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('titlePlaceholder')}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
                            maxLength={100}
                        />
                    </div>

                    {/* Review Text */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                            {t('reviewText')} <span className="text-white/40 text-xs">({t('optional')})</span>
                        </label>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder={t('textPlaceholder')}
                            rows={4}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            maxLength={500}
                        />
                    </div>

                    {/* Reviewer Name */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                            {t('reviewerName')} <span className="text-white/40 text-xs">({t('optional')})</span>
                        </label>
                        <input
                            type="text"
                            value={reviewerName}
                            onChange={(e) => setReviewerName(e.target.value)}
                            placeholder={t('namePlaceholder')}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
                            maxLength={50}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full btn-glossy flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Send size={18} />
                        )}
                        {submitting ? t('submitting') : t('submitReview')}
                    </button>
                </form>
            </GlassCard>
        </div>
    );
}
