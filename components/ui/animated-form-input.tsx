'use client';

import { motion } from "motion/react";
import { useState, forwardRef } from "react";

interface AnimatedFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const AnimatedFormInput = forwardRef<HTMLInputElement, AnimatedFormInputProps>(
    ({ label, error, helperText, className = "", ...props }, ref) => {
        const [isFocused, setIsFocused] = useState(false);

        return (
            <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {label && (
                    <motion.label
                        className="block text-sm font-medium text-white/80 mb-2"
                        animate={{ color: isFocused ? "#38bdf8" : "rgba(255, 255, 255, 0.8)" }}
                    >
                        {label}
                    </motion.label>
                )}
                <motion.div
                    className={`relative`}
                    animate={{
                        boxShadow: isFocused
                            ? "0 0 20px rgba(56, 189, 248, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.1)"
                            : "0 0 0px rgba(56, 189, 248, 0)",
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <input
                        ref={ref}
                        className={`
                            w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5
                            text-white placeholder-white/40 transition-colors
                            focus:outline-none focus:border-primary/50
                            ${error ? 'border-red-500/50' : ''}
                            ${className}
                        `}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        {...props}
                    />
                    {isFocused && (
                        <motion.div
                            className="absolute inset-0 rounded-lg pointer-events-none"
                            style={{
                                boxShadow: "inset 0 0 20px rgba(56, 189, 248, 0.15)",
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    )}
                </motion.div>
                {error && (
                    <motion.p
                        className="text-red-400 text-xs mt-1"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {error}
                    </motion.p>
                )}
                {helperText && !error && (
                    <motion.p
                        className="text-white/40 text-xs mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {helperText}
                    </motion.p>
                )}
            </motion.div>
        );
    }
);

AnimatedFormInput.displayName = 'AnimatedFormInput';
