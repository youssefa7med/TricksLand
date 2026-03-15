import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeolocationRadius } from '@/lib/utils/settings';
import { ACADEMY_LOCATION, ACADEMY_LOCATION_LABEL, ACADEMY_MAP_URL, DEFAULT_GEO_RADIUS_METERS } from '@/lib/academy';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const radius = await getGeolocationRadius().catch(() => DEFAULT_GEO_RADIUS_METERS);

        return NextResponse.json({
            radius,
            location: {
                latitude: ACADEMY_LOCATION.latitude,
                longitude: ACADEMY_LOCATION.longitude,
                label: ACADEMY_LOCATION_LABEL,
                mapUrl: ACADEMY_MAP_URL,
            },
        });
    } catch {
        return NextResponse.json({
            radius: DEFAULT_GEO_RADIUS_METERS,
            location: {
                latitude: ACADEMY_LOCATION.latitude,
                longitude: ACADEMY_LOCATION.longitude,
                label: ACADEMY_LOCATION_LABEL,
                mapUrl: ACADEMY_MAP_URL,
            },
        });
    }
}
