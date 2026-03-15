'use client';

export default function ProtectedLayoutError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-md w-full text-center">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-8">
                    <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                    <p className="text-white/70 text-sm mb-6">{error.message || 'An error occurred'}</p>
                    <button
                        onClick={reset}
                        className="w-full px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
}
