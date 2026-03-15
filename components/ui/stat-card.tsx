import { motion } from "motion/react";
import { ReactNode } from "react";

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    delay?: number;
    className?: string;
}

export function StatCard({ 
    label, 
    value, 
    icon, 
    trend, 
    delay = 0,
    className = ""
}: StatCardProps) {
    return (
        <motion.div
            className={`glass-card rounded-xl p-6 ${className}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
                duration: 0.5, 
                delay,
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            whileHover={{ 
                y: -4, 
                boxShadow: "0 20px 60px rgba(56, 189, 248, 0.15)"
            }}
        >
            <div className="flex justify-between items-start mb-4">
                {icon && (
                    <motion.div 
                        className="text-primary text-3xl"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        {icon}
                    </motion.div>
                )}
                {trend && (
                    <motion.div 
                        className={`text-sm font-semibold ${
                            trend.isPositive ? 'text-green-400' : 'text-red-400'
                        }`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + 0.2 }}
                    >
                        {trend.isPositive ? '+' : '-'}{trend.value}%
                    </motion.div>
                )}
            </div>
            <p className="text-white/60 text-sm mb-2">{label}</p>
            <motion.div 
                className="text-3xl font-bold text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.1 }}
            >
                {value}
            </motion.div>
        </motion.div>
    );
}
