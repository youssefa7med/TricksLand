'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
    getUserLocation,
    isSecureContext,
    getAcademyLocation,
} from '@/lib/geolocation';
import { useRouter } from 'next/navigation';
import { getCoachModuleBreakdown } from '@/lib/utils/billing';

interface AttendanceMarkerProps {
    sessionId: string;
    sessionDate: string;
    courseName: string;
    startTime: string;
    endTime: string;
    /** Pass the existing attendance ID when the coach has already checked in. */
    existingAttendanceId?: string;
    /** Arrival time string (HH:MM:SS) already recorded, triggers checkout mode. */
    existingArrivalTime?: string;
    onSuccess?: () => void;
}

export function AttendanceMarker({
    sessionId,
    sessionDate,
    courseName,
    startTime,
    endTime,
    existingAttendanceId,
    existingArrivalTime,
    onSuccess,
}: AttendanceMarkerProps) {
    const router = useRouter();
    const t = useTranslations('pages.coachAttendance');
    const [loading, setLoading] = useState(false);
    const [marked, setMarked] = useState(false);
    const [checkedOut, setCheckedOut] = useState(false);
    const [distance, setDistance] = useState<number | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [gpsLocation, setGpsLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [checkinResult, setCheckinResult] = useState<{
        id: string;
        arrival_time: string;
    } | null>(null);
    const [checkout, setCheckout] = useState<{
        arrival_time: string;
        leaving_time: string;
        duration_minutes: number;
        billed_hours: number;
    } | null>(null);

    // Check if HTTPS is available
    useEffect(() => {
        if (!isSecureContext()) {
            setLocationError(t('httpsRequired'));
        }
    }, [t]);

    const handleMarkAttendance = async () => {
        setLoading(true);
        setLocationError(null);
        setDistance(null);

        try {
            // 1. Request geolocation permission
            const location = await getUserLocation();
            setGpsLocation(location);

            // 2. Submit to backend API; the server is the source of truth for radius.
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
                if (typeof data.distance === 'number') {
                    setDistance(data.distance);
                }
                setLocationError(data.error || 'Failed to mark attendance');
                setLoading(false);
                return;
            }

            // Success
            setMarked(true);
            setCheckinResult({
                id: data.attendance.id,
                arrival_time: data.attendance.arrival_time,
            });
            setDistance(typeof data.attendance.distance === 'number' ? data.attendance.distance : null);
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

    const handleCheckOut = async () => {
        setLoading(true);
        setLocationError(null);

        const attendanceId = checkinResult?.id ?? existingAttendanceId;

        try {
            const response = await fetch('/api/coach/attendance/mark', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    attendanceId ? { attendanceId } : { sessionId }
                ),
            });

            const data = await response.json();

            if (!response.ok) {
                setLocationError(data.error || t('checkoutFailed'));
                return;
            }

            setCheckedOut(true);
            setCheckout(data.attendance);

            const breakdown = getCoachModuleBreakdown(data.attendance.duration_minutes ?? 0);
            const unit = breakdown.billedHours !== 1 ? t('hrUnit') + 's' : t('hrUnit');
            toast.success(t('checkedOutToast', { hours: breakdown.billedHours, unit }));

            if (onSuccess) onSuccess();
            setTimeout(() => router.refresh(), 1000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            setLocationError(message);
        } finally {
            setLoading(false);
        }
    };

    const academy = getAcademyLocation();
    const alreadyCheckedIn = marked || !!existingAttendanceId;

    return (
        <div className="w-full">
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
                {/* Session Info */}
                <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3">{t('sessionDetails')}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-white/60">{t('courseLabel')}</p>
                            <p className="text-white font-medium">{courseName}</p>
                        </div>
                        <div>
                            <p className="text-white/60">{t('dateLabel')}</p>
                            <p className="text-white font-medium">{sessionDate}</p>
                        </div>
                        <div>
                            <p className="text-white/60">{t('timeLabel')}</p>
                            <p className="text-white font-medium">
                                {startTime} – {endTime}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/60">{t('academyRadius')}</p>
                            <p className="text-white font-medium">{academy.label}</p>
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
                                {t('distanceAway', { distance })}
                            </p>
                        )}
                        {gpsLocation && (
                            <p className="text-red-300 text-xs mt-2">
                                GPS: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                            </p>
                        )}
                    </div>
                )}

                {/* Check-in Success State */}
                {marked && !checkedOut && (
                    <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-200 text-sm flex items-center gap-2">
                            <span className="text-lg">✓</span>
                            <span>
                                {t('checkedInAt', { time: checkinResult?.arrival_time ?? '—' })}
                            </span>
                        </p>
                        {distance !== null && (
                            <p className="text-green-300 text-xs mt-2">
                                {t('distanceVerified', { distance })}
                            </p>
                        )}
                        {gpsLocation && (
                            <p className="text-green-300 text-xs mt-2">
                                GPS: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                            </p>
                        )}
                    </div>
                )}

                {/* Check-out Success State */}
                {checkedOut && checkout && (
                    <div className="mb-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-purple-200 text-sm font-medium mb-2">{t('sessionComplete')}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-purple-300">
                            <div>
                                <span className="text-purple-400">{t('arrivedLabel')}</span>{' '}
                                {checkout.arrival_time}
                            </div>
                            <div>
                                <span className="text-purple-400">{t('leftLabel')}</span>{' '}
                                {checkout.leaving_time}
                            </div>
                            <div>
                                <span className="text-purple-400">{t('durationLabel')}</span>{' '}
                                {checkout.duration_minutes} {t('minUnit')}
                            </div>
                            <div>
                                <span className="text-purple-400">{t('billedHoursLabel')}</span>{' '}
                                <span className="text-purple-200 font-semibold">
                                    {checkout.billed_hours} {t('hrUnit')}
                                </span>
                            </div>
                        </div>
                        {(() => {
                            const bd = getCoachModuleBreakdown(checkout.duration_minutes);
                            return bd.remainderMinutes > 0 ? (
                                <p className="text-purple-400 text-xs mt-2">
                                    ℹ️ {t('remainderNotBilled', { minutes: bd.remainderMinutes })}
                                </p>
                            ) : null;
                        })()}
                    </div>
                )}

                {/* GPS Location Info */}
                {gpsLocation && (
                    <div className="mb-4 bg-white/5 rounded-lg p-3 text-xs">
                        <p className="text-white/70">
                            📍 Location: {gpsLocation.latitude.toFixed(6)},{' '}
                            {gpsLocation.longitude.toFixed(6)}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                {!alreadyCheckedIn && !checkedOut && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleMarkAttendance}
                            disabled={loading}
                            className="flex-1 btn-glossy disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block animate-spin">⏳</span>
                                    {t('gettingLocation')}
                                </>
                            ) : (
                                <>
                                    <span>📍</span>
                                    {t('checkInBtn')}
                                </>
                            )}
                        </button>
                        <button
                            disabled={loading}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
                        >
                            {t('helpBtn')}
                        </button>
                    </div>
                )}

                {/* Check-Out Button (shown after check-in, before check-out) */}
                {alreadyCheckedIn && !checkedOut && (
                    <button
                        onClick={handleCheckOut}
                        disabled={loading}
                        className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 rounded-lg py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="inline-block animate-spin">⏳</span>
                                {t('recordingCheckout')}
                            </>
                        ) : (
                            <>
                                <span>🏁</span>
                                {t('checkOutBtn')}
                            </>
                        )}
                    </button>
                )}

                {/* Info Box */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    {!alreadyCheckedIn ? (
                        <p className="text-blue-200 text-xs">
                            ℹ️ {t('infoPreCheckin', { radius: academy.radius })}
                        </p>
                    ) : !checkedOut ? (
                        <p className="text-blue-200 text-xs">
                            ℹ️ {t('infoPostCheckin')}
                        </p>
                    ) : (
                        <p className="text-blue-200 text-xs">
                            ℹ️ {t('infoPostCheckout')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
