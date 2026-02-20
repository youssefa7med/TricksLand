'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Mode = 'login' | 'register';

export default function LoginPage() {
    const t = useTranslations('auth');
    const supabase = createClient();

    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const inputClass = "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClass = "block text-white/80 text-sm font-medium mb-2";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'register' && !fullName.trim()) {
            toast.error(t('nameRequired'));
            return;
        }
        if (!password || password.length < 6) {
            toast.error(t('passwordTooShort'));
            return;
        }
        setLoading(true);
        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.toLowerCase().trim(),
                    password,
                });
                if (error) throw error;
                toast.success(t('loginSuccess'));
                window.location.href = '/';
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.toLowerCase().trim(),
                    password,
                });
                if (error) throw error;
                if (data.user) {
                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: data.user.id,
                        full_name: fullName.trim(),
                        email: email.toLowerCase().trim(),
                        role: 'coach',
                    } as any);
                    if (profileError && !profileError.message.includes('duplicate')) {
                        toast.error(profileError.message);
                        setLoading(false);
                        return;
                    }
                }
                toast.success(t('registerSuccess'));
                window.location.href = '/';
            }
        } catch (err: any) {
            toast.error(err.message || t('loginError'));
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode: Mode) => {
        setMode(newMode);
        setPassword('');
        setEmail('');
        setFullName('');
        setResetSent(false);
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            toast.error(t('emailRequiredForReset'));
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(
            email.toLowerCase().trim(),
            {
                redirectTo: `https://tricks-land.vercel.app/ar/auth/callback?type=recovery`,
            }
        );
        setLoading(false);
        if (error) {
            toast.error(error.message);
        } else {
            setResetSent(true);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <GlassCard className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <img
                        src="/images/logo.jpg"
                        alt="TricksLand Steam Academy"
                        style={{ height: 'auto', width: 'auto', maxWidth: '280px', objectFit: 'contain', margin: '0 auto 16px' }}
                        suppressHydrationWarning
                    />
                    <p className="text-white/60 text-sm">{t('subtitle')}</p>
                </div>

                {/* Mode toggle */}
                <div className="flex bg-white/10 rounded-xl p-1 mb-8">
                    <button
                        onClick={() => switchMode('login')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'}`}
                    >
                        {t('signIn')}
                    </button>
                    <button
                        onClick={() => switchMode('register')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'}`}
                    >
                        {t('createAccount')}
                    </button>
                </div>

                {mode === 'register' && (
                    <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
                        <p className="text-blue-300 text-sm">{t('coachOnlyNote')}</p>
                    </div>
                )}

                {resetSent ? (
                    <div className="text-center py-8 space-y-4">
                        <p className="text-green-300 text-sm">{t('resetEmailSentDetail')}</p>
                        <button onClick={() => setResetSent(false)} className="text-primary hover:underline text-sm">
                            ← {t('backToLogin')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div>
                                <label className={labelClass}>{t('fullName')} *</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={t('fullNamePlaceholder')}
                                    className={inputClass}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>{t('emailLabel')} *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('emailPlaceholder')}
                                className={inputClass}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-white/80 text-sm font-medium">{t('passwordLabel')} *</label>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        disabled={loading}
                                        className="text-white/40 hover:text-primary text-xs transition-colors"
                                    >
                                        {t('forgotPassword')}
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'register' ? t('passwordPlaceholderNew') : t('passwordPlaceholder')}
                                className={inputClass}
                                required
                                disabled={loading}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                            {mode === 'register' && (
                                <p className="text-white/40 text-xs mt-1">{t('passwordHint')}</p>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="w-full btn-glossy disabled:opacity-50">
                            {loading
                                ? (mode === 'login' ? t('signingIn') : t('creating'))
                                : (mode === 'login' ? t('signIn') : t('createAccount'))}
                        </button>

                        {mode === 'login' && (
                            <p className="text-center text-white/40 text-xs">
                                {t('noAccount')}{' '}
                                <button type="button" onClick={() => switchMode('register')} className="text-primary hover:underline">
                                    {t('createOne')}
                                </button>
                            </p>
                        )}
                    </form>
                )}
            </GlassCard>
        </div>
    );
}
