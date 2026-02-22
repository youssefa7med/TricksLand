'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { GlassCard } from '@/components/layout/GlassCard';
import { toast } from 'sonner';

interface CourseInfo { id: string; name: string; status: string; }
interface Coach {
    id: string;
    full_name: string;
    email: string;
    created_by_admin: boolean | null;
    course_coaches: { courses: CourseInfo | null }[];
}

export default function AdminCoachesPage() {
    const locale = useLocale();
    const t = useTranslations('pages.coaches');
    const tc = useTranslations('common');
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'all' | 'self' | 'admin'>('all');

    const fetchCoaches = async () => {
        try {
            const res = await fetch('/api/admin/coaches');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setCoaches(json as Coach[]);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load coaches');
        }
        setLoading(false);
    };

    useEffect(() => { fetchCoaches(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/coaches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: newName, email: newEmail }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t('coachCreated'));
            setShowCreate(false);
            setNewName('');
            setNewEmail('');
            fetchCoaches();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = async (id: string) => {
        if (!editName.trim()) { toast.error('Name cannot be empty'); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/coaches/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: editName }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t('coachUpdated'));
            setEditingId(null);
            fetchCoaches();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('deleteConfirm').replace('%name%', name))) return;
        try {
            const res = await fetch(`/api/admin/coaches/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t('coachDeleted'));
            fetchCoaches();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const inputClass = "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary";

    const selfRegistered = coaches.filter((c) => !c.created_by_admin);
    const filteredCoaches = filter === 'all' ? coaches : filter === 'self' ? selfRegistered : coaches.filter((c) => c.created_by_admin);

    if (loading) {
        return <div className="page-container flex items-center justify-center"><p className="text-white/70 text-lg">{t('loadingCoaches')}</p></div>;
    }

    return (
        <div className="page-container">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start flex-wrap gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{t('title')}</h1>
                        <p className="text-white/70">
                            {coaches.length} {t('subtitle')}
                            {selfRegistered.length > 0 && (
                                <span className="ml-2 text-green-400">
                                    · {selfRegistered.length} {t('selfRegistered')}
                                </span>
                            )}
                        </p>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)} className="btn-glossy">
                        {showCreate ? tc('cancel') : t('addCoach')}
                    </button>
                </div>

                {/* Filter tabs */}
                {coaches.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {([
                            { key: 'all', label: `${t('allFilter')} (${coaches.length})` },
                            { key: 'self', label: `${t('selfFilter')} (${selfRegistered.length})` },
                            { key: 'admin', label: `${t('adminFilter')} (${coaches.length - selfRegistered.length})` },
                        ] as const).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === key
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Create form */}
                {showCreate && (
                    <GlassCard className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">{t('newCoach')}</h2>
                        <form onSubmit={handleCreate} className="flex gap-4 flex-wrap items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-white/70 text-sm mb-1">{t('fullNameLabel')}</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={t('fullNamePlaceholder')}
                                    className={`w-full ${inputClass}`}
                                    required
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-white/70 text-sm mb-1">{t('emailLabel')}</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="coach@email.com"
                                    className={`w-full ${inputClass}`}
                                    required
                                />
                            </div>
                            <button type="submit" disabled={creating} className="btn-glossy disabled:opacity-50">
                                {creating ? tc('creating') : t('newCoach')}
                            </button>
                        </form>
                        <p className="text-white/40 text-xs mt-3">{t('otpNote')}</p>
                    </GlassCard>
                )}

                {/* Coaches list */}
                {coaches.length === 0 ? (
                    <GlassCard>
                        <div className="text-center py-12">
                            <p className="text-white/70 text-lg mb-2">{t('noCoachesYet')}</p>
                            <p className="text-white/50 text-sm">{t('noCoachesHint')}</p>
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-white/70">{t('nameCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70">{t('emailCol')}</th>
                                        <th className="text-left py-3 px-4 text-white/70">{t('coursesCol')}</th>
                                        <th className="text-right py-3 px-4 text-white/70">{t('actionsCol')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCoaches.map((coach) => {
                                        const courses = coach.course_coaches.map((cc) => cc.courses).filter(Boolean) as CourseInfo[];
                                        const isEditing = editingId === coach.id;
                                        const isSelfRegistered = !coach.created_by_admin;

                                        return (
                                            <tr key={coach.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className={`${inputClass} text-sm`}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Link
                                                                href={`/${locale}/admin/coaches/${coach.id}`}
                                                                className="text-primary hover:text-white font-medium"
                                                            >
                                                                {coach.full_name}
                                                            </Link>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSelfRegistered
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : 'bg-blue-500/20 text-blue-400'
                                                                }`}>
                                                                {isSelfRegistered ? t('selfRegisteredBadge') : t('adminCreatedBadge')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-white/70 text-sm">{coach.email}</td>
                                                <td className="py-3 px-4">
                                                    {courses.length === 0 ? (
                                                        <span className="text-white/30 text-sm italic">{t('noCourses')}</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {courses.map((c) => (
                                                                <span key={c.id} className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-gray-500/20 text-gray-400'}`}>
                                                                    {c.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEdit(coach.id)}
                                                                    disabled={saving}
                                                                    className="text-green-400 hover:text-green-300 text-sm transition-colors disabled:opacity-50"
                                                                >
                                                                    {saving ? tc('saving') : tc('save')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="text-white/50 hover:text-white text-sm transition-colors"
                                                                >
                                                                    {tc('cancel')}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => { setEditingId(coach.id); setEditName(coach.full_name); }}
                                                                    className="text-primary hover:text-white text-sm transition-colors"
                                                                >
                                                                    {tc('edit')}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(coach.id, coach.full_name)}
                                                                    className="text-red-400 hover:text-red-300 text-sm transition-colors"
                                                                >
                                                                    {tc('delete')}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredCoaches.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-white/40 text-sm">
                                                {t('noFilterMatch')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
