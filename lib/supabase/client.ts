import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

// Wraps every localStorage call in try/catch so restricted contexts (iframes,
// Safari ITP, "Block all cookies") never surface an unhandled error.
const createCustomStorage = () => {
    if (typeof window === 'undefined') {
        return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        };
    }
    return {
        getItem: (key: string) => {
            try {
                return window.localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        setItem: (key: string, value: string) => {
            try {
                window.localStorage.setItem(key, value);
            } catch {
                // Storage not accessible; session won't persist across reloads.
            }
        },
        removeItem: (key: string) => {
            try {
                window.localStorage.removeItem(key);
            } catch {
                // Ignore.
            }
        },
    };
};

export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                storage: createCustomStorage(),
            },
        }
    );
}
