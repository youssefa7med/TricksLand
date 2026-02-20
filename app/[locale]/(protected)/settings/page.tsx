'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';
import Link from 'next/link';
import { useLocale } from 'next-intl';

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
    const locale = useLocale();
    const supabase = createClient();

    // ── Profile ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setSelfId(user.id);

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
        if (!fullName.trim()) { toast.error('Full name is required'); return; }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }
        const { error } = await (supabase as any)
            .from('profiles')
            .update({ full_name: fullName.trim() })
            .eq('id', user.id);
        if (error) toast.error(error.message);
        else toast.success('Profile updated successfully');
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
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-white/70">Manage your account and users</p>
                </div>

                {/* ── Profile Card ── */}
                <GlassCard className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-5">My Profile</h2>
                    <form onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                required
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/50 cursor-not-allowed"
                            />
                            <p className="text-white/40 text-xs mt-1">Email cannot be changed here.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Role</label>
                            <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${role === 'admin' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                                    }`}>
                                    {role === 'admin' ? 'Administrator' : 'Coach'}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="submit" disabled={saving} className="btn-glossy disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <Link href={dashboardHref} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white transition-colors">
                                Cancel
                            </Link>
                        </div>
                    </form>
                </GlassCard>

                {/* ── User Management — Admin only ── */}
                {role === 'admin' && (
                    <UserManagement selfId={selfId} />
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management Component
// ─────────────────────────────────────────────────────────────────────────────
function UserManagement({ selfId }: { selfId: string }) {
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
            toast.success(`${tab === 'admin' ? 'Admin' : 'Coach'} created successfully`);
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
        if (!editName.trim()) { toast.error('Name cannot be empty'); return; }
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
            toast.success('User updated');
            setEditId(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        }
        setEditSaving(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Remove user "${name}"? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success('User removed');
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">User Management</h2>
                    <p className="text-white/50 text-sm">Create and manage admin &amp; coach accounts</p>
                </div>
                <button
                    onClick={() => { setShowCreate(!showCreate); setEditId(null); }}
                    className="btn-glossy text-sm"
                >
                    {showCreate ? 'Cancel' : `+ Add ${tab === 'admin' ? 'Admin' : 'Coach'}`}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {(['admin', 'coach'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setShowCreate(false); setEditId(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                            }`}
                    >
                        {t === 'admin' ? 'Admins' : 'Coaches'} ({users.filter((u) => u.role === t).length})
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                    <h3 className="text-white font-medium mb-4">
                        New {tab === 'admin' ? 'Admin' : 'Coach'} Account
                    </h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/70 text-xs font-medium mb-1">Full Name *</label>
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
                            <label className="block text-white/70 text-xs font-medium mb-1">Email *</label>
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
                            <label className="block text-white/70 text-xs font-medium mb-1">Password * (min 6 chars)</label>
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
                                {creating ? 'Creating...' : `Create ${tab === 'admin' ? 'Admin' : 'Coach'}`}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Table */}
            {loadingUsers ? (
                <p className="text-white/50 text-sm py-6 text-center">Loading users...</p>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-white/50 text-sm">
                        No {tab === 'admin' ? 'admins' : 'coaches'} found. Click &quot;Add {tab === 'admin' ? 'Admin' : 'Coach'}&quot; to create one.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-3 text-white/60 text-sm font-medium">Name</th>
                                <th className="text-left py-3 px-3 text-white/60 text-sm font-medium">Email</th>
                                <th className="text-right py-3 px-3 text-white/60 text-sm font-medium">Actions</th>
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
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">You</span>
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
                                                        {editSaving ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditId(null)}
                                                        className="text-white/40 hover:text-white text-sm transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => startEdit(u)}
                                                        className="text-primary hover:text-white text-sm transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    {!isSelf && (
                                                        <button
                                                            onClick={() => handleDelete(u.id, u.full_name)}
                                                            className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                                        >
                                                            Remove
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
