'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { ReactNode } from 'react';

interface AnimatedDropdownProps {
    trigger: ReactNode | string;
    items: { label: string | ReactNode; value: string; icon?: ReactNode }[];
    onSelect: (value: string) => void;
    className?: string;
    triggerClassName?: string;
}

export function AnimatedDropdown({
    trigger,
    items,
    onSelect,
    className = "",
    triggerClassName = ""
}: AnimatedDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className={`relative inline-block ${className}`}>
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors ${triggerClassName}`}
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                whileTap={{ scale: 0.98 }}
            >
                {trigger}
                <motion.svg
                    className="w-4 h-4"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </motion.svg>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="absolute top-full left-0 mt-2 w-48 glass-card rounded-lg border border-white/20 z-50 shadow-2xl"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="py-2">
                            {items.map((item, idx) => (
                                <motion.button
                                    key={item.value}
                                    onClick={() => {
                                        onSelect(item.value);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ x: 4 }}
                                >
                                    {item.icon && <span>{item.icon}</span>}
                                    <span>{item.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
