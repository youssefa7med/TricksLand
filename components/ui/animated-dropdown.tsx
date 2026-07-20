'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface AnimatedDropdownProps {
    trigger: ReactNode | string;
    items: { label: string | ReactNode; value: string; icon?: ReactNode }[];
    onSelect: (value: string) => void;
    className?: string;
    triggerClassName?: string;
    selectedValue?: string;
}

export function AnimatedDropdown({
    trigger,
    items,
    onSelect,
    className = "",
    triggerClassName = "",
    selectedValue = ""
}: AnimatedDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    const updatePosition = useCallback(() => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setMenuStyle({
                top: rect.bottom + window.scrollY + 6,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement)?.closest('.ad-portal-menu')
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {/* Trigger */}
            <motion.button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between gap-3 w-full
                    px-4 py-3 rounded-2xl
                    bg-white/[0.08] backdrop-blur-xl
                    border border-white/[0.12]
                    text-white/90 text-sm font-medium
                    transition-all duration-300 ease-out
                    hover:bg-white/[0.14] hover:border-white/[0.2]
                    hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                    ${isOpen ? 'bg-white/[0.14] border-primary/40 shadow-[0_8px_32px_rgba(249,115,22,0.15)]' : ''}
                    ${triggerClassName}
                `}
                whileTap={{ scale: 0.985 }}
            >
                <span className="truncate text-right flex-1">{trigger}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <ChevronDown size={18} className="text-primary/80 shrink-0" />
                </motion.div>
            </motion.button>

            {/* Portal menu — renders at body level, above everything */}
            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className="ad-portal-menu"
                            style={{
                                position: 'absolute',
                                top: menuStyle.top,
                                left: menuStyle.left,
                                width: menuStyle.width,
                                zIndex: 999999,
                            }}
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        >
                            <div
                                className="
                                    rounded-2xl overflow-hidden
                                    bg-gradient-to-b from-white/[0.96] to-white/[0.90]
                                    backdrop-blur-2xl
                                    border border-white/[0.35]
                                    shadow-[0_20px_60px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.1)]
                                "
                            >
                                <div className="py-1.5 px-1.5 max-h-[260px] overflow-y-auto">
                                    {items.map((item, idx) => {
                                        const isSelected = item.value === selectedValue;
                                        return (
                                            <motion.button
                                                key={item.value}
                                                type="button"
                                                onClick={() => {
                                                    onSelect(item.value);
                                                    setIsOpen(false);
                                                }}
                                                className={`
                                                    w-full flex items-center justify-between gap-2
                                                    px-3.5 py-2.5 rounded-xl
                                                    text-sm font-medium
                                                    transition-all duration-150 ease-out
                                                    ${isSelected
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-gray-700 hover:bg-black/[0.04] hover:text-gray-900'
                                                    }
                                                `}
                                                initial={{ opacity: 0, x: -6 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03, duration: 0.2 }}
                                                whileHover={{ x: 2 }}
                                            >
                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                                                    <span className="truncate">{item.label}</span>
                                                </div>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                    >
                                                        <Check size={16} className="text-primary shrink-0" strokeWidth={3} />
                                                    </motion.div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
