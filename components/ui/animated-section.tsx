'use client';

import { motion } from "motion/react";
import { ReactNode } from "react";

interface AnimatedSectionProps {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    delay?: number;
}

export function AnimatedSection({
    title,
    subtitle,
    children,
    className = "",
    delay = 0
}: AnimatedSectionProps) {
    return (
        <motion.section
            className={className}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            {(title || subtitle) && (
                <div className="mb-6 md:mb-8">
                    {title && (
                        <motion.h2
                            className="text-2xl md:text-3xl font-bold text-white"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: delay + 0.1 }}
                        >
                            {title}
                        </motion.h2>
                    )}
                    {subtitle && (
                        <motion.p
                            className="text-white/50 text-sm mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: delay + 0.2 }}
                        >
                            {subtitle}
                        </motion.p>
                    )}
                </div>
            )}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: delay + 0.2 }}
            >
                {children}
            </motion.div>
        </motion.section>
    );
}
