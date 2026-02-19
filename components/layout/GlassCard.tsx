import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
    return (
        <div
            className={cn(
                "glass-card rounded-xl p-6 transition-smooth",
                hover && "hover:shadow-2xl hover:bg-white/15 hover:-translate-y-1",
                className
            )}
        >
            {children}
        </div>
    );
}
