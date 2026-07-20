'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={16} />
            </button>
            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`dots-${i}`} className="px-2 text-white/30">...</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        }`}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

export function usePagination<T>(items: T[], perPage = 20) {
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(items.length / perPage);
    const paginated = items.slice((page - 1) * perPage, page * perPage);

    const goToPage = (p: number) => {
        setPage(Math.max(1, Math.min(p, totalPages)));
    };

    return { page, totalPages, paginated, goToPage, setPage };
}
