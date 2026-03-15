export function LuxuryLoader({
    label = 'Loading',
    center = true,
}: {
    label?: string;
    center?: boolean;
}) {
    return (
        <div className={center ? 'min-h-[55vh] flex items-center justify-center' : ''}>
            <div className="glass-card rounded-3xl px-7 py-6 text-center loading-wave">
                <div className="luxury-loader justify-center mb-3">
                    <span className="luxury-loader-dot" />
                    <span className="luxury-loader-dot" />
                    <span className="luxury-loader-dot" />
                </div>
                <p className="text-white/70 text-sm tracking-wide">{label}</p>
            </div>
        </div>
    );
}
