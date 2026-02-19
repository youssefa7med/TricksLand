'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const locale = useLocale();
    const supabase = createClient();

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email, role')
                .eq('id', user.id)
                .single();

            if (profile) {
                setFullName((profile as any).full_name || '');
                setEmail((profile as any).email || '');
                setRole((profile as any).role || '');
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) {
            toast.error('Full name is required');
            return;
        }
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await (supabase as any)
            .from('profiles')
            .update({ full_name: fullName.trim() })
            .eq('id', user.id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Profile updated successfully');
        }
        setSaving(false);
    };

    const dashboardHref = role === 'admin' ? `/${locale}/admin/dashboard` : `/${locale}/coach/dashboard`;

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center">
                <p className="text-white/70 text-lg">Loading...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href={dashboardHref} className="text-white/60 hover:text-white transition-colors text-sm">
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Profile Settings</h1>
                    <p className="text-white/70">Manage your account information</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Full Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                required
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/50 cursor-not-allowed"
                            />
                            <p className="text-white/40 text-xs mt-1">Email cannot be changed here. Contact your admin.</p>
                        </div>

                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Role
                            </label>
                            <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                                    role === 'admin'
                                        ? 'bg-secondary/20 text-secondary'
                                        : 'bg-primary/20 text-primary'
                                }`}>
                                    {role === 'admin' ? 'Administrator' : 'Coach'}
                                </span>
                            </div>
                            <p className="text-white/40 text-xs mt-1">Role is managed by the administrator.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-glossy disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <Link
                                href={dashboardHref}
                                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
