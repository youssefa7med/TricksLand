'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, LogOut, Menu, X } from 'lucide-react';

export function Navbar({ role }: { role: 'admin' | 'coach' }) {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('nav');
    const tc = useTranslations('common');
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Close mobile menu on route change
    useEffect(() => { setIsOpen(false); }, [pathname]);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/${locale}/login`);
    };

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
        { name: t('dashboard'), href: `/${locale}/admin/dashboard`, icon: 'dashboard' },
        { name: t('courses'), href: `/${locale}/admin/courses`, icon: 'courses' },
        { name: t('sessions'), href: `/${locale}/admin/sessions`, icon: 'sessions' },
        { name: `${t('students')}`, href: `/${locale}/admin/students`, icon: 'students' },
        { name: `${t('studentAttendance')}`, href: `/${locale}/admin/student-attendance`, icon: 'attendance' },
        { name: t('coaches'), href: `/${locale}/admin/coaches`, icon: 'coaches' },
        { name: `${t('attendance')}`, href: `/${locale}/admin/attendance`, icon: 'attendance' },
        { name: t('adjustments'), href: `/${locale}/admin/adjustments`, icon: 'adjustments' },
        { name: `${t('financial')}`, href: `/${locale}/admin/financial`, icon: 'financial' },
        { name: `${t('reports')}`, href: `/${locale}/admin/reports`, icon: 'reports' },
        { name: `${t('scheduling')}`, href: `/${locale}/admin/scheduling`, icon: 'scheduling' },
        { name: t('invoices'), href: `/${locale}/admin/invoices`, icon: 'invoices' },
    ];

    const coachNav = [
        { name: t('dashboard'), href: `/${locale}/coach/dashboard`, icon: 'dashboard' },
        { name: t('sessions'), href: `/${locale}/coach/sessions`, icon: 'sessions' },
        { name: `${t('studentAttendance')}`, href: `/${locale}/coach/student-attendance`, icon: 'attendance' },
        { name: `${t('myAttendance')}`, href: `/${locale}/coach/attendance`, icon: 'attendance' },
        { name: t('myCourses'), href: `/${locale}/coach/courses`, icon: 'courses' },
        { name: t('adjustments'), href: `/${locale}/coach/adjustments`, icon: 'adjustments' },
        { name: t('invoices'), href: `/${locale}/coach/invoices`, icon: 'invoices' },
    ];

    const navItems = role === 'admin' ? adminNav : coachNav;
    const isActive = (href: string) => pathname === href;
    const langLabel = locale === 'en' ? 'العربية' : 'English';

    return (
        <motion.nav 
            className="sticky top-0 z-50 glass-nav border-b border-white/5"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="max-w-full px-4 sm:px-6 lg:px-8">
                {/* Top Navigation Bar */}
                <div className="flex justify-between items-center h-16 md:h-20">
                    {/* Logo Section */}
                    <motion.div 
                        className="shrink-0 flex items-center gap-2 sm:gap-3"
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <Link 
                            href={`/${locale}`}
                            className="group relative flex items-center gap-2 sm:gap-3 rounded-lg border border-white/10 bg-white/[0.05] px-2 sm:px-3 py-1.5 sm:py-2 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                        >
                            <img
                                src="/images/tricksland-lux-logo.svg"
                                alt="TricksLand"
                                className="h-10 sm:h-12 w-auto object-contain"
                            />
                            <div className="hidden sm:block">
                                <div className="text-xs sm:text-sm font-bold tracking-widest text-primary whitespace-nowrap">
                                    TRICKSLAND
                                </div>
                                <div className="text-[10px] sm:text-xs font-medium text-white/50 whitespace-nowrap">
                                    Academy
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1 flex-1 mx-6 max-w-2xl">
                        {navItems.map((item, idx) => (
                            <motion.div
                                key={item.href}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <Link
                                    href={item.href}
                                    className={`relative px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                                        isActive(item.href)
                                            ? 'text-primary bg-primary/10'
                                            : 'text-white/70 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {item.name}
                                    {isActive(item.href) && (
                                        <motion.div 
                                            layoutId="activeIndicator"
                                            className="absolute inset-0 rounded-md border border-primary/30 bg-primary/5"
                                            initial={{ scale: 0.95 }}
                                            animate={{ scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                        {/* Language Toggle */}
                        <motion.button
                            onClick={handleToggleLanguage}
                            className="hidden sm:block px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title={locale === 'en' ? 'العربية' : 'English'}
                        >
                            {langLabel}
                        </motion.button>

                        {/* Desktop: User Menu */}
                        <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
                            <span className="text-xs font-medium text-white/50 capitalize px-2">
                                {role}
                            </span>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    href={`/${locale}/settings`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-all"
                                    title={t('settings')}
                                >
                                    <Settings size={16} />
                                    <span className="hidden lg:inline">{t('settings')}</span>
                                </Link>
                            </motion.div>
                            <motion.button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={tc('logout')}
                            >
                                <LogOut size={16} />
                                <span className="hidden lg:inline">{tc('logout')}</span>
                            </motion.button>
                        </div>

                        {/* Mobile Language + Menu Toggle */}
                        <div className="flex md:hidden items-center gap-2">
                            <motion.button
                                onClick={handleToggleLanguage}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-all"
                                whileTap={{ scale: 0.95 }}
                                title={locale === 'en' ? 'العربية' : 'English'}
                            >
                                <span className="text-xs font-bold">{locale === 'en' ? 'ع' : 'EN'}</span>
                            </motion.button>

                            <motion.button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                                whileTap={{ scale: 0.95 }}
                                aria-label="Toggle menu"
                            >
                                {isOpen ? <X size={20} /> : <Menu size={20} />}
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            className="md:hidden border-t border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="py-3 px-2 space-y-1">
                                {/* Navigation Items */}
                                {navItems.map((item, idx) => (
                                    <motion.div
                                        key={item.href}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                isActive(item.href)
                                                    ? 'bg-primary/15 text-primary border border-primary/30'
                                                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <span>{item.name}</span>
                                            {isActive(item.href) && (
                                                <motion.span 
                                                    className="w-2 h-2 rounded-full bg-primary"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                />
                                            )}
                                        </Link>
                                    </motion.div>
                                ))}

                                {/* Mobile User Actions */}
                                <div className="border-t border-white/5 pt-3 mt-3 space-y-1">
                                    <div className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-white/40">
                                        {role}
                                    </div>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <Link
                                            href={`/${locale}/settings`}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-primary/10 hover:text-primary transition-all"
                                        >
                                            <Settings size={16} />
                                            {t('settings')}
                                        </Link>
                                    </motion.div>
                                    <motion.button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.12 }}
                                    >
                                        <LogOut size={16} />
                                        {tc('logout')}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
