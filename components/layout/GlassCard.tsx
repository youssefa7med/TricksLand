import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "motion/react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    delay?: number;
}

export function GlassCard({ children, className, hover = false, delay = 0 }: GlassCardProps) {
    return (
        <motion.div
            className={cn(
                "glass-card rounded-xl p-6 transition-smooth",
                hover && "hover:shadow-2xl hover:bg-white/15 hover:-translate-y-1",
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={hover ? { y: -4 } : {}}
        >
            {children}
        </motion.div>
    );
}
