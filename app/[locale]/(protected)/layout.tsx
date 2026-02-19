import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = ((profile as any)?.role || 'coach') as 'admin' | 'coach';

    return (
        <>
            <Navbar role={role} />
            {children}
        </>
    );
}
