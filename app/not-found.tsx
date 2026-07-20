import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="page-container flex items-center justify-center">
            <div className="glass-card rounded-2xl p-10 max-w-md text-center">
                <p className="text-7xl font-black text-primary mb-4">404</p>
                <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
                <p className="text-white/60 mb-6">The page you are looking for does not exist or has been moved.</p>
                <Link href="/" className="btn-glossy inline-block">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
