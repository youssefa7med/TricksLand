'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleDelete = async () => {
        if (!confirm('Delete this session?')) return;
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
        <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-300 transition-colors text-sm disabled:opacity-50"
        >
            {deleting ? 'Deleting...' : 'Delete'}
        </button>
    );
}
