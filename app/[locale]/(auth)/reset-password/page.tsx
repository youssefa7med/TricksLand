'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect, Suspense } from 'react';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
    const router = useRouter();
    const t = useTranslations('auth');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const supabase = createClient();

    // Check for recovery session when page loads
    useEffect(() => {
        const checkRecoverySession = async () => {
            try {
                const { data: { session }, error: err } = await supabase.auth.getSession();

                if (err) {
                    console.error('Session check error:', err);
                    setError('An error occurred while checking your reset link.');
                    setVerifying(false);
                    return;
                }

                if (!session) {
                    setError('This password reset link has expired or is invalid. Please request a new one.');
                }

                setVerifying(false);
            } catch (err: any) {
                console.error('Error verifying recovery session:', err);
                setError('An error occurred while verifying your reset link.');
                setVerifying(false);
            }
        };

        checkRecoverySession();
    }, [supabase]);

    const validatePassword = (): string[] => {
        const errors: string[] = [];

        if (!password) {
            errors.push('Password is required');
        } else {
            if (password.length < 6) {
                errors.push('Password must be at least 6 characters');
            }
            if (!/[A-Z]/.test(password)) {
                errors.push('Must contain uppercase letter (A-Z)');
            }
            if (!/[a-z]/.test(password)) {
                errors.push('Must contain lowercase letter (a-z)');
            }
            if (!/[0-9]/.test(password)) {
                errors.push('Must contain number (0-9)');
            }
        }

        if (!confirmPassword) {
            errors.push('Please confirm your password');
        } else if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        return errors;
    };

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const errors = validatePassword();
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);
        setLoading(true);
        setError(null);

        try {
            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                throw new Error(updateError.message);
            }

            setSuccess(true);

            // Clear form
            setPassword('');
            setConfirmPassword('');

            // Sign out and redirect to login
            await supabase.auth.signOut();

            // Wait 2 seconds then redirect
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            console.error('Password reset error:', err);
            setError(err?.message || 'Failed to reset password. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {t('resetPassword')}
                    </h1>
                    <p className="text-gray-600">
                        Create a new password for your account
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8 backdrop-blur-xl">
                    {verifying ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 mx-auto mb-3 text-indigo-600 animate-spin" />
                            <p className="text-gray-600">Verifying reset link...</p>
                        </div>
                    ) : error && !success ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                            <Link
                                href="/login"
                                className="block w-full text-center bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : success ? (
                        <div className="text-center py-8 space-y-4">
                            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                    Password Reset Successful!
                                </h2>
                                <p className="text-sm text-gray-600">
                                    Redirecting to login page...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            {validationErrors.length > 0 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm font-medium text-amber-900 mb-2">
                                        Please fix these issues:
                                    </p>
                                    <ul className="space-y-1">
                                        {validationErrors.map((err, i) => (
                                            <li key={i} className="text-sm text-amber-700 flex gap-2">
                                                <span className="flex-shrink-0">•</span>
                                                <span>{err}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        disabled={loading}
                                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Field */}
                            <div>
                                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirm"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        disabled={loading}
                                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={loading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Requirements */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-2">
                                    Password Requirements:
                                </p>
                                <ul className="space-y-1 text-xs text-blue-700">
                                    <li>✓ At least 6 characters</li>
                                    <li>✓ One uppercase letter (A-Z)</li>
                                    <li>✓ One lowercase letter (a-z)</li>
                                    <li>✓ One number (0-9)</li>
                                </ul>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>

                            {/* Back to Login */}
                            <p className="text-center text-sm text-gray-600">
                                Remember your password?{' '}
                                <Link
                                    href="/login"
                                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Back to Login
                                </Link>
                            </p>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    Need help? Contact support at{' '}
                    <a href="https://tricksland.com/support" className="text-indigo-600 hover:text-indigo-700">
                        tricksland.com/support
                    </a>
                </p>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                    <div className="glass-card rounded-2xl p-8 text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-3 text-indigo-600 animate-spin" />
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
