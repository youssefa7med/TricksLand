import { NextResponse } from 'next/server';

export async function POST() {
    // This endpoint is called to clear the settings cache
    // In a real production app, you might use Redis or other cache layer
    // For now, the SettingsCache in lib/utils/settings.ts will expire after 5 minutes
    // or can be manually cleared by restarting the server
    return NextResponse.json({ success: true, message: 'Cache invalidation requested' });
}
