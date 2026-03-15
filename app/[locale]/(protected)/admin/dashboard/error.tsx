'use client';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-6 text-center">
                    <h2 className="text-lg font-semibold text-white mb-2">Error Loading Dashboard</h2>
                    <p className="text-white/70 mb-4">{error.message || 'An error occurred while loading the dashboard'}</p>
                    <button
                        onClick={reset}
                        className="inline-block px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
}
