'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/components/ui/useConfirm';

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

    const handleDelete = async () => {
        const confirmed = await confirm('Delete Session', 'Are you sure you want to delete this session? This cannot be undone.', true);
        if (!confirmed) return;
        setDeleting(true);
        const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
        if (error) {
            toast.error(error.message);
            setDeleting(false);
        } else {
            toast.success('Session deleted');
            router.refresh();
        }
    };

    return (
        <>
            <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} danger={confirmState.danger} onConfirm={handleConfirm} onCancel={handleCancel} />
            <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-400 hover:text-red-300 transition-colors text-sm disabled:opacity-50"
            >
                {deleting ? 'Deleting...' : 'Delete'}
            </button>
        </>
    );
}
