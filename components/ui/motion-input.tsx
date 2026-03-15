'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface MotionInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const MotionInput = React.forwardRef<HTMLInputElement, MotionInputProps>(
    ({ className, type, ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false);

        return (
            <motion.div
                className="relative"
                animate={{
                    boxShadow: isFocused
                        ? '0 0 20px rgba(98, 164, 255, 0.3)'
                        : '0 0 0px rgba(98, 164, 255, 0)',
                }}
                transition={{ duration: 0.3 }}
            >
                <input
                    type={type}
                    className={cn(
                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
                        className
                    )}
                    ref={ref}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    {...props}
                />
                {isFocused && (
                    <motion.div
                        className="absolute inset-0 border border-primary rounded-md pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </motion.div>
        );
    }
);
MotionInput.displayName = 'MotionInput';

export { MotionInput };
