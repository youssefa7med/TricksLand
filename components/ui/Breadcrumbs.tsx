'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    const locale = useLocale();
    const isRtl = locale === 'ar';

    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm flex-wrap">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={index} className="flex items-center gap-1.5">
                            {index > 0 && (
                                isRtl
                                    ? <ChevronLeft size={14} className="text-white/30 shrink-0" />
                                    : <ChevronRight size={14} className="text-white/30 shrink-0" />
                            )}
                            {isLast || !item.href ? (
                                <span className="text-white/50 font-medium">{item.label}</span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className="text-primary/80 hover:text-primary transition-colors font-medium"
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
