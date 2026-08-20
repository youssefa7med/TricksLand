'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Star, User, Calendar, Clock } from 'lucide-react';
import { useEffect } from 'react';

interface Review {
    id: string;
    rating: number;
    title: string;
    review_text: string | null;
    responses: Record<string, unknown>;
    reviewer_name: string | null;
    created_at: string;
    profiles?: { full_name: string };
    courses?: { name: string };
}

interface ReviewDetailsModalProps {
    review: Review | null;
    isOpen: boolean;
    onClose: () => void;
    formatQuestionKey: (key: string) => string;
    formatDate: (dateString: string) => string;
    formatTime: (dateString: string) => string;
    showCoach?: boolean;
    showCourse?: boolean;
}

export function ReviewDetailsModal({
    review,
    isOpen,
    onClose,
    formatQuestionKey,
    formatDate,
    formatTime,
    showCoach = false,
    showCourse = false,
}: ReviewDetailsModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!review) return null;

    const responseEntries = review.responses
        ? Object.entries(review.responses).filter(([key, v]) => {
            if (!v || !String(v).trim()) return false;
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('id') && String(v).includes('-')) return false;
            if (lowerKey === 'coachid' || lowerKey === 'courseid') return false;
            return true;
        })
        : [];

    const ratingColor = (rating: number) => {
        if (rating >= 4) return 'text-green-400';
        if (rating >= 3) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal */}
                    <motion.div
                        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 border border-white/10 shadow-2xl"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/10">
                            <div className="flex-1">
                                {/* Rating */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star
                                                key={i}
                                                size={20}
                                                className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                                            />
                                        ))}
                                    </div>
                                    <span className={`text-lg font-bold ${ratingColor(review.rating)}`}>
                                        {review.rating}/5
                                    </span>
                                </div>

                                {/* Title */}
                                <h2 className="text-xl font-bold text-white mb-2">{review.title}</h2>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {formatDate(review.created_at)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {formatTime(review.created_at)}
                                    </div>
                                    {showCoach && review.profiles?.full_name && (
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span className="text-primary">{review.profiles.full_name}</span>
                                        </div>
                                    )}
                                    {showCourse && review.courses?.name && (
                                        <span className="text-secondary">{review.courses.name}</span>
                                    )}
                                </div>
                            </div>

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white ml-4"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                            {/* Review text */}
                            {review.review_text && (
                                <div className="mb-6">
                                    <p className="text-white/75 text-sm leading-relaxed whitespace-pre-line">
                                        {review.review_text}
                                    </p>
                                </div>
                            )}

                            {/* Questions & Answers */}
                            {responseEntries.length > 0 && (
                                <div>
                                    <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
                                        Questions & Answers
                                    </h3>
                                    <div className="space-y-3">
                                        {responseEntries.map(([key, value]) => (
                                            <div
                                                key={key}
                                                className="bg-white/[0.05] border border-white/10 rounded-xl p-4"
                                            >
                                                <p className="text-primary text-xs font-semibold mb-1.5 uppercase tracking-wide">
                                                    {formatQuestionKey(key)}
                                                </p>
                                                <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                                                    {String(value)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
