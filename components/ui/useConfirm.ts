'use client';

import { useState, useEffect } from 'react';

export function useConfirm() {
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        message: string;
        danger: boolean;
        resolve: ((value: boolean) => void) | null;
    }>({ open: false, title: '', message: '', danger: false, resolve: null });

    const confirm = (title: string, message: string, danger = false): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({ open: true, title, message, danger, resolve });
        });
    };

    const handleConfirm = () => {
        confirmState.resolve?.(true);
        setConfirmState(s => ({ ...s, open: false, resolve: null }));
    };

    const handleCancel = () => {
        confirmState.resolve?.(false);
        setConfirmState(s => ({ ...s, open: false, resolve: null }));
    };

    return { confirm, confirmState, handleConfirm, handleCancel };
}
