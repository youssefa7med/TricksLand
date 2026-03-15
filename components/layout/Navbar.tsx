'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';

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

    // Language toggle: swap the locale segment in the current URL
    const handleToggleLanguage = () => {
        const targetLocale = locale === 'en' ? 'ar' : 'en';
        const segments = pathname.split('/');
        if (segments[1] === 'en' || segments[1] === 'ar') {
            segments[1] = targetLocale;
        } else {
            segments.splice(1, 0, targetLocale);
        }
        router.push(segments.join('/'));
    };

    const adminNav = [
        { name: t('dashboard'),                  href: `/${locale}/admin/dashboard` },
        { name: t('courses'),                    href: `/${locale}/admin/courses` },
        { name: t('sessions'),                   href: `/${locale}/admin/sessions` },
        { name: `${t('students')}`,              href: `/${locale}/admin/students` },
        { name: `${t('attendance')}`,            href: `/${locale}/admin/attendance` },
        { name: `${t('studentAttendance')}`,     href: `/${locale}/admin/student-attendance` },
        { name: t('adjustments'),                href: `/${locale}/admin/adjustments` },
        { name: t('coaches'),                    href: `/${locale}/admin/coaches` },
        { name: `${t('financial')}`,             href: `/${locale}/admin/financial` },
        { name: `${t('reports')}`,               href: `/${locale}/admin/reports` },
        { name: `${t('scheduling')}`,            href: `/${locale}/admin/scheduling` },
        { name: t('invoices'),                   href: `/${locale}/admin/invoices` },
    ];

    const coachNav = [
        { name: t('dashboard'),              href: `/${locale}/coach/dashboard` },
        { name: t('sessions'),               href: `/${locale}/coach/sessions` },
        { name: `${t('myAttendance')}`,      href: `/${locale}/coach/attendance` },
        { name: `${t('studentAttendance')}`, href: `/${locale}/coach/student-attendance` },
        { name: t('myCourses'),              href: `/${locale}/coach/courses` },
        { name: t('adjustments'),            href: `/${locale}/coach/adjustments` },
        { name: t('invoices'),               href: `/${locale}/coach/invoices` },
    ];

    const navItems = role === 'admin' ? adminNav : coachNav;

    const isActive = (href: string) => pathname === href;

    // Show Arabic letter when in English (to switch to Arabic), and "EN" when in Arabic (to switch to English)
    const langLabel = locale === 'en' ? 'ع' : 'EN';

    return (
        <motion.nav 
            className="glass-nav sticky top-0 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                {/* Top bar */}
                <div className="flex justify-between items-center h-14 md:h-16">

                    {/* Logo + Brand Name */}
                    <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                        <Link href={`/${locale}`} className="shrink-0 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 shadow-[0_10px_35px_rgba(15,23,42,0.08)] transition-all hover:bg-white/15">
                        <img
                            src="/images/tricksland-lux-logo.svg"
                            alt="TricksLand Steam Academy"
                            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
                            suppressHydrationWarning
                        />
                        <span className="hidden sm:block">
                            <span className="block text-sm font-extrabold tracking-[0.24em] text-primary">TRICKSLAND</span>
                            <span className="block text-[11px] font-medium uppercase tracking-[0.32em] text-white/60">Steam Nursery</span>
                        </span>
                        </Link>
                    </motion.div>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-4 flex-1 mx-6 overflow-x-auto">
                        {navItems.map((item, idx) => (
                            <motion.div
                                key={item.href}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Link
                                    href={item.href}
                                    className={`text-sm transition-colors relative whitespace-nowrap px-2 py-1 ${
                                        isActive(item.href)
                                            ? 'text-primary font-semibold'
                                            : 'text-white/70 hover:text-white'
                                    }`}
                                >
                                    {item.name}
                                    <AnimatePresence>
                                        {isActive(item.href) && (
                                            <motion.div 
                                                layoutId="activeNavIndicator"
                                                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary"
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                exit={{ scaleX: 0 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2">
                        {/* Language toggle - always visible */}
                        <motion.button
                            onClick={handleToggleLanguage}
                            title={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1.5 rounded-lg text-white text-sm font-bold transition-colors min-w-[36px] text-center"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {langLabel}
                        </motion.button>

                        {/* Desktop: role badge + settings + logout */}
                        <div className="hidden md:flex items-center gap-2">
                            <motion.span 
                                className="text-white/50 text-xs capitalize px-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {role}
                            </motion.span>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    href={`/${locale}/settings`}
                                    className="bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg text-primary transition-colors text-sm"
                                >
                                    {t('settings')}
                                </Link>
                            </motion.div>
                            <motion.button
                                onClick={handleLogout}
                                className="bg-secondary/10 hover:bg-secondary/20 px-3 py-1.5 rounded-lg text-secondary transition-colors text-sm"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {tc('logout')}
                            </motion.button>
                        </div>

                        {/* Mobile: hamburger button */}
                        <motion.button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden bg-primary/10 hover:bg-primary/20 p-2 rounded-lg text-primary transition-colors"
                            aria-label="Toggle menu"
                            whileTap={{ scale: 0.95 }}
                        >
                            {isOpen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            className="md:hidden border-t border-primary/20 py-3 pb-4"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Nav links */}
                            <div className="space-y-1 mb-3">
                                {navItems.map((item, idx) => (
                                    <motion.div
                                        key={item.href}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                                isActive(item.href)
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'text-white/75 hover:bg-primary/10 hover:text-white'
                                            }`}
                                        >
                                            {item.name}
                                            {isActive(item.href) && (
                                                <motion.span 
                                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                />
                                            )}
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-primary/20 pt-3 mt-1 space-y-1">
                                <div className="px-4 py-1 text-gray-400 text-xs uppercase tracking-wider">
                                    {role}
                                </div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <Link
                                        href={`/${locale}/settings`}
                                        className="flex items-center px-4 py-3 rounded-xl text-sm text-white/75 hover:bg-primary/10 hover:text-white transition-colors"
                                    >
                                        {t('settings')}
                                    </Link>
                                </motion.div>
                                <motion.button
                                    onClick={handleLogout}
                                    className="w-full text-left flex items-center px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    whileTap={{ scale: 0.98 }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    {tc('logout')}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
