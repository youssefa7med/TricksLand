'use client';

import { motion } from 'motion/react';

export function LuxuryLoader({
    label = 'Loading',
    center = true,
}: {
    label?: string;
    center?: boolean;
}) {
    const dotVariants = {
        hidden: { opacity: 0 },
        visible: (i: number) => ({
            opacity: [0.6, 1, 0.6],
            y: [0, -8, 0],
            transition: {
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
            },
        }),
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1,
            },
        },
    };

    return (
        <div className={center ? 'min-h-[55vh] flex items-center justify-center' : ''}>
            <motion.div
                className="glass-card rounded-3xl px-7 py-6 text-center relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Animated shimmer effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Loader dots */}
                <motion.div
                    className="flex gap-2 justify-center mb-4"
                    variants={containerVariants as any}
                    initial="hidden"
                    animate="visible"
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            custom={i}
                            variants={dotVariants as any}
                            initial="hidden"
                            animate="visible"
                            className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/50"
                        />
                    ))}
                </motion.div>

                {/* Label with fade in */}
                <motion.p
                    className="text-white/70 text-sm tracking-wider font-medium"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    {label}
                </motion.p>

                {/* Optional animated dots decoration */}
                <motion.div
                    className="flex gap-1 justify-center mt-3"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants as any}
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={`mini-${i}`}
                            variants={{
                                hidden: { scale: 0 },
                                visible: {
                                    scale: [0.4, 1, 0.4],
                                    transition: {
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                    },
                                },
                            } as any}
                            className="w-1 h-1 rounded-full bg-primary/40"
                        />
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
}
