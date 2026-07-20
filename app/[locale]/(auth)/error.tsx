'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error(error); }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-10 max-w-md text-center">
                <p className="text-5xl font-black text-red-400 mb-4">!</p>
                <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
                <p className="text-white/60 mb-6 text-sm">{error.message || 'Failed to authenticate. Please try again.'}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={reset} className="btn-glossy text-sm">Try Again</button>
                    <Link href="/login" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm font-medium transition-colors">Login</Link>
                </div>
            </div>
        </div>
    );
}
