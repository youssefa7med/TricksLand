'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    getUserLocation,
    isWithinAcademy,
    isSecureContext,
    getAcademyLocation,
} from '@/lib/geolocation';
import { useRouter } from 'next/navigation';

interface AttendanceMarkerProps {
    sessionId: string;
    sessionDate: string;
    courseName: string;
    startTime: string;
    endTime: string;
    onSuccess?: () => void;
}

export function AttendanceMarker({
    sessionId,
    sessionDate,
    courseName,
    startTime,
    endTime,
    onSuccess,
}: AttendanceMarkerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [marked, setMarked] = useState(false);
    const [distance, setDistance] = useState<number | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [gpsLocation, setGpsLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    // Check if HTTPS is available
    useEffect(() => {
        if (!isSecureContext()) {
            setLocationError(
                'This feature requires HTTPS. Please use a secure connection.'
            );
        }
    }, []);

    const handleMarkAttendance = async () => {
        setLoading(true);
        setLocationError(null);
        setDistance(null);

        try {
            // 1. Request geolocation permission
            const location = await getUserLocation();
            setGpsLocation(location);

            // 2. Check if within academy
            const { isWithin, distance: calculatedDistance } = isWithinAcademy(
                location.latitude,
                location.longitude
            );

            setDistance(calculatedDistance);

            if (!isWithin) {
                const academy = getAcademyLocation();
                setLocationError(
                    `You are ${calculatedDistance}m away from the academy. ` +
                    `Maximum allowed distance is ${academy.radius}m.`
                );
                setLoading(false);
                return;
            }

            // 3. Submit to backend API
            const response = await fetch('/api/coach/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId,
                    latitude: location.latitude,
                    longitude: location.longitude,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setLocationError(data.error || 'Failed to mark attendance');
                setLoading(false);
                return;
            }

            // Success
            setMarked(true);
            toast.success('✓ Attendance marked successfully!');

            if (onSuccess) {
                onSuccess();
            }

            // Refresh after 1 second
            setTimeout(() => {
                router.refresh();
            }, 1000);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'An error occurred';
            setLocationError(message);
            console.error('Attendance marking error:', error);
        } finally {
            setLoading(false);
        }
    };

    const academy = getAcademyLocation();

    return (
        <div className="w-full">
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
                {/* Session Info */}
                <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3">Session Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-white/60">Course</p>
                            <p className="text-white font-medium">{courseName}</p>
                        </div>
                        <div>
                            <p className="text-white/60">Date</p>
                            <p className="text-white font-medium">{sessionDate}</p>
                        </div>
                        <div>
                            <p className="text-white/60">Time</p>
                            <p className="text-white font-medium">
                                {startTime} – {endTime}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/60">Academy Radius</p>
                            <p className="text-white font-medium">{academy.radius}m</p>
                        </div>
                    </div>
                </div>

                {/* Error State */}
                {locationError && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-200 text-sm flex items-start gap-2">
                            <span className="text-lg">⚠️</span>
                            <span>{locationError}</span>
                        </p>
                        {distance !== null && (
                            <p className="text-red-300 text-xs mt-2">
                                Distance: {distance}m
                            </p>
                        )}
                    </div>
                )}

                {/* Success State */}
                {marked && (
                    <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-200 text-sm flex items-center gap-2">
                            <span className="text-lg">✓</span>
                            <span>Attendance marked successfully!</span>
                        </p>
                        {distance !== null && (
                            <p className="text-green-300 text-xs mt-2">
                                Distance verified: {distance}m from academy
                            </p>
                        )}
                    </div>
                )}

                {/* GPS Location Info */}
                {gpsLocation && (
                    <div className="mb-4 bg-white/5 rounded-lg p-3 text-xs">
                        <p className="text-white/70">
                            📍 Location: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                        </p>
                    </div>
                )}

                {/* Action Button */}
                {!marked && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleMarkAttendance}
                            disabled={loading}
                            className="flex-1 btn-glossy disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block animate-spin">⏳</span>
                                    Getting location...
                                </>
                            ) : (
                                <>
                                    <span>📍</span>
                                    Mark Attendance Now
                                </>
                            )}
                        </button>
                        <button
                            disabled={loading}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
                        >
                            ℹ️ Help
                        </button>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-200 text-xs">
                        ℹ️ <strong>How it works:</strong> Click the button to enable location
                        access. We'll verify you're within {academy.radius}m of the academy
                        before recording your attendance.
                    </p>
                </div>
            </div>
        </div>
    );
}
