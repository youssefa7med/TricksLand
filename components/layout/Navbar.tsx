'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale, useTranslations } from 'next-intl';

export function Navbar({ role }: { role: 'admin' | 'coach' }) {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('nav');
    const tc = useTranslations('common');
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => { setIsOpen(false); }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/${locale}/login`);
    };

    const adminNav = [
        { name: t('dashboard'), href: `/${locale}/admin/dashboard` },
        { name: t('courses'), href: `/${locale}/admin/courses` },
        { name: t('sessions'), href: `/${locale}/admin/sessions` },
        { name: '📍 Attendance', href: `/${locale}/admin/attendance` },
        { name: t('adjustments'), href: `/${locale}/admin/adjustments` },
        { name: t('coaches'), href: `/${locale}/admin/coaches` },
        { name: t('students'), href: `/${locale}/admin/students` },
        { name: t('invoices'), href: `/${locale}/admin/invoices` },
    ];

    const coachNav = [
        { name: t('dashboard'), href: `/${locale}/coach/dashboard` },
        { name: t('sessions'), href: `/${locale}/coach/sessions` },
        { name: '📍 Attendance', href: `/${locale}/coach/attendance` },
        { name: t('myCourses'), href: `/${locale}/coach/courses` },
        { name: t('adjustments'), href: `/${locale}/coach/adjustments` },
        { name: t('invoices'), href: `/${locale}/coach/invoices` },
    ];

    const navItems = role === 'admin' ? adminNav : coachNav;

    const isActive = (href: string) => pathname === href;

    return (
        <nav className="glass-nav sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                {/* Top bar */}
                <div className="flex justify-between items-center h-14 md:h-16">

                    {/* Logo */}
                    <Link
                        href={`/${locale}`}
                        className="shrink-0"
                    >
                        <img
                            src="/images/logo.jpg"
                            alt="TricksLand Steam Academy"
                            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
                            suppressHydrationWarning
                        />
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-5 flex-1 mx-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-sm transition-colors relative whitespace-nowrap ${
                                    isActive(item.href)
                                        ? 'text-white font-semibold'
                                        : 'text-white/70 hover:text-white'
                                }`}
                            >
                                {item.name}
                                {isActive(item.href) && (
                                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2">
                        {/* Desktop: role badge + settings + logout */}
                        <div className="hidden md:flex items-center gap-2">
                            <span className="text-white/40 text-xs capitalize px-1">{role}</span>
                            <Link
                                href={`/${locale}/settings`}
                                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-colors text-sm"
                            >
                                {t('settings')}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-colors text-sm"
                            >
                                {tc('logout')}
                            </button>
                        </div>

                        {/* Mobile: hamburger button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isOpen ? (
                                // X icon
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                // Hamburger icon
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                {isOpen && (
                    <div className="md:hidden border-t border-white/10 py-3 pb-4">
                        {/* Nav links */}
                        <div className="space-y-1 mb-3">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-primary/20 text-white'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {item.name}
                                    {isActive(item.href) && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/10 pt-3 mt-1 space-y-1">
                            <div className="px-4 py-1 text-white/30 text-xs uppercase tracking-wider">
                                {role}
                            </div>
                            <Link
                                href={`/${locale}/settings`}
                                className="flex items-center px-4 py-3 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                {t('settings')}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left flex items-center px-4 py-3 rounded-xl text-sm text-red-400/80 hover:bg-white/10 hover:text-red-300 transition-colors"
                            >
                                {tc('logout')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
