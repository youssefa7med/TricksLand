// Geolocation and distance calculation utilities
// Haversine formula for accurate distance calculation

const ACADEMY_LOCATION = {
    latitude: 29.073694,
    longitude: 31.112250,
    radius: 50, // meters
};

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - First latitude
 * @param lon1 - First longitude
 * @param lat2 - Second latitude
 * @param lon2 - Second longitude
 * @returns Distance in meters
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degreesToRadians(lat1)) *
            Math.cos(degreesToRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.asin(Math.sqrt(a));
    const distance = EARTH_RADIUS_METERS * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if a location is within the allowed radius of the academy
 */
export function isWithinAcademy(
    latitude: number,
    longitude: number,
    radius: number = ACADEMY_LOCATION.radius
): { isWithin: boolean; distance: number } {
    const distance = haversineDistance(
        ACADEMY_LOCATION.latitude,
        ACADEMY_LOCATION.longitude,
        latitude,
        longitude
    );

    return {
        isWithin: distance <= radius,
        distance,
    };
}

/**
 * Get user's current location using Geolocation API
 */
export async function getUserLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
}> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    reject(
                        new Error(
                            'Location permission denied. Please enable location access.'
                        )
                    );
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    reject(new Error('Location information unavailable'));
                } else if (error.code === error.TIMEOUT) {
                    reject(new Error('Location request timeout'));
                } else {
                    reject(new Error('Unable to get your location'));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    });
}

/**
 * Check if HTTPS is being used (requirement for geolocation)
 */
export function isSecureContext(): boolean {
    return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

/**
 * Get Academy location constant
 */
export function getAcademyLocation() {
    return ACADEMY_LOCATION;
}
