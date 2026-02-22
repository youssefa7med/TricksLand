/**
 * Billing and Time Calculation Utilities
 * Handles quarter-hour increments and coach billing logic
 */

/**
 * Convert time string (HH:MM:SS or HH:MM) to minutes
 */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

/**
 * Calculate duration in minutes between two time strings
 * @param startTime Time in format "HH:MM" or "HH:MM:SS"
 * @param endTime Time in format "HH:MM" or "HH:MM:SS"
 * @returns Duration in minutes
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Handle case where end time is on next day (e.g., 23:00 to 01:00)
  if (endMinutes < startMinutes) {
    return endMinutes + 24 * 60 - startMinutes;
  }

  return endMinutes - startMinutes;
}

/**
 * Calculate billable hours in quarter-hour increments
 * 
 * Rules:
 *  - Less than 15 minutes: 0 hours
 *  - 15-29 minutes: 0.25 hours
 *  - 30-44 minutes: 0.5 hours
 *  - 45-59 minutes: 0.75 hours
 *  - Continue in 15-minute increments
 * 
 * @param durationMinutes Duration in minutes
 * @returns Billable hours (in 0.25 increments)
 */
export function calculateBillableHours(durationMinutes: number): number {
  // If less than 15 minutes, no billing
  if (durationMinutes < 15) {
    return 0;
  }

  // Round up to nearest quarter hour (15 minutes)
  const quarterHours = Math.ceil(durationMinutes / 15);

  // Each quarter hour = 0.25 hours
  return quarterHours * 0.25;
}

/**
 * Calculate billable hours from start and end times
 * @param startTime Time in format "HH:MM" or "HH:MM:SS"
 * @param endTime Time in format "HH:MM" or "HH:MM:SS"
 * @returns Billable hours
 */
export function calculateBillableHoursFromTimes(startTime: string, endTime: string): number {
  const durationMinutes = calculateDurationMinutes(startTime, endTime);
  return calculateBillableHours(durationMinutes);
}

/**
 * Format hours to display string (e.g., "1.25 hours" or "1.5 hours")
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '0 hours';
  if (hours === 1) return '1 hour';
  return `${hours} hours`;
}

/**
 * Calculate total billing for a session
 */
export function calculateSessionBilling(
  startTime: string,
  endTime: string,
  hourlyRate: number
): {
  durationMinutes: number;
  billableHours: number;
  totalAmount: number;
} {
  const durationMinutes = calculateDurationMinutes(startTime, endTime);
  const billableHours = calculateBillableHours(durationMinutes);
  const totalAmount = Math.round(billableHours * hourlyRate * 100) / 100;

  return {
    durationMinutes,
    billableHours,
    totalAmount,
  };
}

/**
 * Validate time string format (HH:MM or HH:MM:SS)
 */
export function isValidTimeString(timeStr: string): boolean {
  const regex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
  return regex.test(timeStr);
}

/**
 * Get quarter-hour breakdown for display
 * Used for coach understanding their billing
 */
export function getQuarterHourBreakdown(durationMinutes: number): {
  quarters: number;
  hours: number;
  billable: boolean;
  message: string;
} {
  if (durationMinutes < 15) {
    return {
      quarters: 0,
      hours: 0,
      billable: false,
      message: `Not billable (under 15 minutes: ${durationMinutes} min)`,
    };
  }

  const quarters = Math.ceil(durationMinutes / 15);
  const hours = quarters * 0.25;

  const minRange = (quarters - 1) * 15;
  const maxRange = quarters * 15;

  return {
    quarters,
    hours,
    billable: true,
    message: `${hours} hours (${minRange + 1}-${maxRange} minutes)`,
  };
}
