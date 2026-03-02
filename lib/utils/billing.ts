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

// ============================================================================
// COACH TIME CALCULATION – 15-MINUTE MODULES (FLOOR, no rounding up)
// ============================================================================

/**
 * Calculate coach billed hours using strict 15-minute completed modules.
 *
 * Business rules:
 *  - If duration < 15 minutes          → billed_hours = 0
 *  - completed_modules = FLOOR(minutes / 15)
 *  - billed_hours      = completed_modules × 0.25
 *  - Partial modules are NEVER billed  (do NOT round up)
 *
 * Examples:
 *  10 min  → 0      |  15 min → 0.25  |  16 min → 0.25
 *  29 min  → 0.25   |  30 min → 0.5   |  44 min → 0.5
 *  45 min  → 0.75   |  60 min → 1.0   |  61 min → 1.0
 *  75 min  → 1.25
 *
 * @param durationMinutes Total minutes the coach was present
 * @returns Billed hours in 0.25 increments (FLOOR-based)
 */
export function calculateCoachBilledHours(durationMinutes: number): number {
  // Less than one full module → no billing
  if (durationMinutes < 15) {
    return 0;
  }

  // Completed 15-minute modules (FLOOR – never round up)
  const completedModules = Math.floor(durationMinutes / 15);

  // Each completed module = 0.25 hours
  return completedModules * 0.25;
}

/**
 * Calculate coach billed hours directly from arrival and leaving time strings.
 *
 * @param arrivalTime  Time in format "HH:MM" or "HH:MM:SS"
 * @param leavingTime  Time in format "HH:MM" or "HH:MM:SS"
 * @returns Billed hours using the 15-minute module rule (FLOOR)
 */
export function calculateCoachBilledHoursFromTimes(
  arrivalTime: string,
  leavingTime: string
): number {
  const durationMinutes = calculateDurationMinutes(arrivalTime, leavingTime);
  return calculateCoachBilledHours(durationMinutes);
}

/**
 * Calculate total coach session payment using the 15-minute module rule.
 *
 * @param arrivalTime  Time in format "HH:MM" or "HH:MM:SS"
 * @param leavingTime  Time in format "HH:MM" or "HH:MM:SS"
 * @param hourlyRate   Coach's hourly rate (EGP/hr)
 */
export function calculateCoachSessionPayment(
  arrivalTime: string,
  leavingTime: string,
  hourlyRate: number
): {
  durationMinutes: number;
  billedHours: number;
  totalAmount: number;
} {
  const durationMinutes = calculateDurationMinutes(arrivalTime, leavingTime);
  const billedHours = calculateCoachBilledHours(durationMinutes);
  const totalAmount = Math.round(billedHours * hourlyRate * 100) / 100;

  return {
    durationMinutes,
    billedHours,
    totalAmount,
  };
}

/**
 * Get 15-minute module breakdown for display (coach billing).
 * Shows completed modules, ignored remainder minutes, and final billed hours.
 */
export function getCoachModuleBreakdown(durationMinutes: number): {
  completedModules: number;
  remainderMinutes: number;
  billedHours: number;
  billable: boolean;
  message: string;
} {
  if (durationMinutes < 15) {
    return {
      completedModules: 0,
      remainderMinutes: durationMinutes,
      billedHours: 0,
      billable: false,
      message: `Not billable – less than one full module (${durationMinutes} min < 15 min)`,
    };
  }

  const completedModules = Math.floor(durationMinutes / 15);
  const remainderMinutes = durationMinutes % 15;
  const billedHours = completedModules * 0.25;

  return {
    completedModules,
    remainderMinutes,
    billedHours,
    billable: true,
    message:
      `${billedHours} hrs — ${completedModules} module${completedModules !== 1 ? 's' : ''} × 0.25` +
      (remainderMinutes > 0
        ? ` (${remainderMinutes} min remainder ignored)`
        : ''),
  };
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
