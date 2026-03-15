import { motion } from "motion/react";
import { ReactNode } from "react";

interface AnimatedTableRowProps {
    children: ReactNode;
    index?: number;
    className?: string;
    onClick?: () => void;
    isClickable?: boolean;
}

export function AnimatedTableRow({ 
    children, 
    index = 0, 
    className = "",
    onClick,
    isClickable = false
}: AnimatedTableRowProps) {
    return (
        <motion.tr
            className={`
                ${isClickable ? 'cursor-pointer' : ''} 
                ${className}
            `}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
                delay: 0.1 + (index % 10) * 0.03,
                duration: 0.4
            }}
            whileHover={isClickable ? { 
                backgroundColor: "rgba(56, 189, 248, 0.1)",
                x: 4
            } : {}}
            onClick={onClick}
        >
            {children}
        </motion.tr>
    );
}
