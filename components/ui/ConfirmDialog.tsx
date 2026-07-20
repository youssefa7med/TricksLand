'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmDialog({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    danger = false,
}: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onCancel}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                    <motion.div
                        className="relative glass-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <button
                            onClick={onCancel}
                            className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                                <AlertTriangle size={20} className={danger ? 'text-red-400' : 'text-yellow-400'} />
                            </div>
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        </div>
                        <p className="text-white/70 text-sm mb-6">{message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                    danger
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-primary hover:bg-primary/80'
                                }`}
                            >
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
