'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

interface ManagedUser {
    id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'coach';
    created_at: string;
}

const inputClass =
    'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary';
const inputClassSm =
    'bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm';
const labelClass = 'block text-white/80 text-sm font-medium mb-2';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [selfId, setSelfId] = useState('');
    const [baseHourlyRate, setBaseHourlyRate] = useState<number | null>(null);
    const [rateEffectiveFrom, setRateEffectiveFrom] = useState<string | null>(null);
    const locale = useLocale();
    const t = useTranslations('pages.settings');
    const supabase = createClient();

    // ── Profile ──────────────────────────────────────────────────────────────
    // Use the server-side API (service role) so base_hourly_rate is always
    // fresh — the Supabase browser singleton can serve stale data after
    // switching accounts due to Next.js internal fetch caching.
    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setSelfId(user.id);

            const res = await fetch('/api/coach/profile', { cache: 'no-store' });
            if (!res.ok) { setLoading(false); return; }
            const { profile } = await res.json();

            if (profile) {
                setFullName(profile.full_name || '');
                setEmail(profile.email || '');
                setRole(profile.role || '');
                setBaseHourlyRate(profile.base_hourly_rate ?? null);
                setRateEffectiveFrom(profile.rate_effective_from ?? null);
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) { toast.error(locale === 'ar' ? 'الاسم مطلوب' : 'Full name is required'); return; }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }
        const { error } = await (supabase as any)
            .from('profiles')
            .update({ full_name: fullName.trim() })
            .eq('id', user.id);
        if (error) toast.error(error.message);
        else toast.success(t('profileUpdated'));
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
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href={dashboardHref} className="text-white/60 hover:text-white transition-colors text-sm">
                        {t('backToDashboard')}
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('title')}</h1>
                    <p className="text-white/70">{t('subtitle')}</p>
                </div>

                {/* ── Profile Card ── */}
                <GlassCard className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-5">{t('myProfile')}</h2>
                    <form onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className={labelClass}>{t('fullNameLabel')} <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder={t('fullNamePlaceholder')}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>{t('emailLabel')}</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/50 cursor-not-allowed"
                            />
                            <p className="text-white/40 text-xs mt-1">{t('emailHint')}</p>
                        </div>
                        {/* Base rate — visible to coaches only, read-only */}
                        {role === 'coach' && (
                            <div>
                                <label className={labelClass}>Base Hourly Rate</label>
                                <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70">
                                    {baseHourlyRate != null
                                        ? `${Number(baseHourlyRate).toLocaleString()} EGP / hr`
                                        : 'Not set yet — contact your admin'}
                                    {rateEffectiveFrom && (
                                        <span className="text-white/40 text-xs ml-2">(effective {rateEffectiveFrom})</span>
                                    )}
                                </div>
                                <p className="text-white/40 text-xs mt-1">Set by admin. Contact admin to update.</p>
                            </div>
                        )}
                        <div>
                            <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${role === 'admin' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                                    }`}>
                                    {role === 'admin' ? t('adminRole') : t('coachRole')}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="submit" disabled={saving} className="btn-glossy disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? t('saving') : t('saveChanges')}
                            </button>
                            <Link href={dashboardHref} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">
                                {t('cancel')}
                            </Link>
                        </div>
                    </form>
                </GlassCard>

                {/* ── User Management — Admin only ── */}
                {role === 'admin' && (
                    <>
                        <UserManagement selfId={selfId} />
                        <div className="mt-8">
                            <AdminSystemSettings />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management Component
// ─────────────────────────────────────────────────────────────────────────────
function UserManagement({ selfId }: { selfId: string }) {
    const t = useTranslations('pages.settings');
    const [tab, setTab] = useState<'admin' | 'coach'>('admin');
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Edit state
    const [editId, setEditId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const res = await fetch('/api/admin/users');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setUsers(json as ManagedUser[]);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load users');
        }
        setLoadingUsers(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const filtered = users.filter((u) => u.role === tab);

    const resetCreate = () => { setNewName(''); setNewEmail(''); setNewPassword(''); setShowCreate(false); };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: newName, email: newEmail, password: newPassword, role: tab }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(`${tab === 'admin' ? t('adminRole') : t('coachRole')} ${t('userCreated')}`);
            resetCreate();
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        }
        setCreating(false);
    };

    const startEdit = (u: ManagedUser) => {
        setEditId(u.id);
        setEditName(u.full_name);
        setEditEmail(u.email);
        setEditPassword('');
    };

    const handleEdit = async (id: string) => {
        if (!editName.trim()) { toast.error(tab === 'admin' ? 'الاسم مطلوب' : 'Name cannot be empty'); return; }
        setEditSaving(true);
        try {
            const body: any = { full_name: editName };
            if (editEmail.trim()) body.email = editEmail.trim();
            if (editPassword.trim()) body.password = editPassword.trim();

            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t('userUpdated'));
            setEditId(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        }
        setEditSaving(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('deleteConfirm').replace('%name%', name) + ' This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t('userRemoved'));
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">{t('userManagement')}</h2>
                    <p className="text-white/50 text-sm">{t('userManagementSubtitle')}</p>
                </div>
                <button
                    onClick={() => { setShowCreate(!showCreate); setEditId(null); }}
                    className="btn-glossy text-sm"
                >
                    {showCreate ? t('cancelCreate') : (tab === 'admin' ? t('addAdmin') : t('addCoach'))}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {(['admin', 'coach'] as const).map((tabKey) => (
                    <button
                        key={tabKey}
                        onClick={() => { setTab(tabKey); setShowCreate(false); setEditId(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === tabKey
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                            }`}
                    >
                        {tabKey === 'admin' ? t('adminTab') : t('coachTab')} ({users.filter((u) => u.role === tabKey).length})
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                    <h3 className="text-white font-medium mb-4">
                        {tab === 'admin' ? t('newAdminAccount') : t('newCoachAccount')}
                    </h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-xs font-medium mb-1">{t('fullNameInputLabel')}</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Full name"
                                className={`w-full ${inputClassSm}`}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs font-medium mb-1">{t('emailInputLabel')}</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="email@example.com"
                                className={`w-full ${inputClassSm}`}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs font-medium mb-1">{t('passwordLabel')}</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full ${inputClassSm}`}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={creating} className="btn-glossy text-sm w-full disabled:opacity-50">
                                {creating ? t('creating') : (tab === 'admin' ? t('createAdmin') : t('createCoach'))}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Table */}
            {loadingUsers ? (
                <p className="text-white/50 text-sm py-6 text-center">{t('loadingUsers')}</p>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-white/50 text-sm">
                        {tab === 'admin' ? t('noAdmins') : t('noCoaches')}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-3 text-white/60 text-sm font-medium">{t('nameCol')}</th>
                                <th className="text-left py-3 px-3 text-white/60 text-sm font-medium">{t('emailCol')}</th>
                                <th className="text-right py-3 px-3 text-white/60 text-sm font-medium">{t('actionsCol')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const isEditing = editId === u.id;
                                const isSelf = u.id === selfId;
                                return (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-3">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className={`${inputClassSm} w-full`}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white text-sm font-medium">{u.full_name}</span>
                                                    {isSelf && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{t('youBadge')}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        type="email"
                                                        value={editEmail}
                                                        onChange={(e) => setEditEmail(e.target.value)}
                                                        placeholder="Email"
                                                        className={`${inputClassSm} w-full`}
                                                    />
                                                    <input
                                                        type="password"
                                                        value={editPassword}
                                                        onChange={(e) => setEditPassword(e.target.value)}
                                                        placeholder="New password (leave blank to keep)"
                                                        className={`${inputClassSm} w-full`}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-white/60 text-sm">{u.email}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {isEditing ? (
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleEdit(u.id)}
                                                        disabled={editSaving}
                                                        className="text-green-400 hover:text-green-300 text-sm transition-colors disabled:opacity-50"
                                                    >
                                                        {editSaving ? t('savingBtn') : t('saveBtn')}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditId(null)}
                                                        className="text-white/40 hover:text-white text-sm transition-colors"
                                                    >
                                                        {t('cancelCreate')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => startEdit(u)}
                                                        className="text-primary hover:text-white text-sm transition-colors"
                                                    >
                                                        {t('editBtn')}
                                                    </button>
                                                    {!isSelf && (
                                                        <button
                                                            onClick={() => handleDelete(u.id, u.full_name)}
                                                            className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                                        >
                                                            {t('removeBtn')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </GlassCard>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin System Settings Component
// ─────────────────────────────────────────────────────────────────────────────
function AdminSystemSettings() {
    const t = useTranslations('pages.settings');
    const supabase = createClient();
    const [geoRadius, setGeoRadius] = useState('60');
    const [platformName, setPlatformName] = useState('TricksLand Academy');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (supabase as any)
            .from('admin_settings')
            .select('key, value')
            .in('key', ['geolocation_radius_meters', 'platform_name'])
            .then(({ data }: any) => {
                if (data) {
                    data.forEach((s: any) => {
                        if (s.key === 'geolocation_radius_meters') setGeoRadius(s.value);
                        if (s.key === 'platform_name') setPlatformName(s.value);
                    });
                }
                setLoading(false);
            });
    }, []);

    const handleSave = async (key: string, value: string) => {
        setSaving(true);
        const { error } = await (supabase as any)
            .from('admin_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        setSaving(false);
        if (error) toast.error(error.message);
        else toast.success(t('settingSaved'));
    };

    if (loading) return null;

    const inputCls = 'bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary';

    return (
        <GlassCard>
            <h2 className="text-lg font-semibold text-white mb-2">{t('systemSettings')}</h2>
            <p className="text-white/50 text-sm mb-5">{t('systemSettingsSubtitle')}</p>
            <div className="space-y-5">
                <div>
                    <label className="block text-white/80 text-sm font-medium mb-1">
                        {t('geoRadiusLabel')}
                    </label>
                    <p className="text-white/40 text-xs mb-2">
                        {t('geoRadiusHint')}
                    </p>
                    <div className="flex gap-3">
                        <input type="number" min="10" max="500" value={geoRadius}
                            onChange={e => setGeoRadius(e.target.value)} className={`w-32 ${inputCls}`} />
                        <button onClick={() => handleSave('geolocation_radius_meters', geoRadius)} disabled={saving}
                            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                            {saving ? t('savingDots') : t('saveSetting')}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-white/80 text-sm font-medium mb-1">{t('platformNameLabel')}</label>
                    <div className="flex gap-3">
                        <input type="text" value={platformName} onChange={e => setPlatformName(e.target.value)}
                            className={`flex-1 max-w-xs ${inputCls}`} />
                        <button onClick={() => handleSave('platform_name', platformName)} disabled={saving}
                            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                            {saving ? t('savingDots') : t('saveSetting')}
                        </button>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
