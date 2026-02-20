'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that detects recovery/reset tokens in URL hash
 * and redirects to the reset password page if found
 * 
 * Supabase sends recovery links with URL fragments like:
 * https://app.com#access_token=...&type=recovery
 */
export function RecoveryRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Only run on client-side and on initial load
        const checkRecoveryToken = () => {
            const hash = window.location.hash;
            
            // Check if we have a recovery token in the hash
            // Supabase recovery emails contain: #access_token=xxx&type=recovery
            const isRecoveryFlow = (
                hash.includes('type=recovery') ||
                (hash.includes('access_token') && hash.includes('type=recovery'))
            );
            
            // Also check query params for recovery code
            const currentUrl = new URL(window.location.href);
            const type = currentUrl.searchParams.get('type');
            const isQueryRecovery = type === 'recovery';

            if (isRecoveryFlow || isQueryRecovery) {
                // Preserve the entire hash/query when redirecting
                // The reset-password page will extract the token from the hash
                window.location.href = '/reset-password';
            }
        };

        // Run check immediately and also after a small delay to ensure hash is available
        checkRecoveryToken();
        
        const timeoutId = setTimeout(checkRecoveryToken, 100);
        
        return () => clearTimeout(timeoutId);
    }, [router]);

    return null;
}
