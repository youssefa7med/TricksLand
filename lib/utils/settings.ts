/**
 * Admin Settings Management
 * Handles retrieval and caching of configurable system settings
 */

import { createClient } from '@/lib/supabase/client';
import { AdminSetting } from '@/types/database';

// Simple in-memory cache with TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
class SettingsCache {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();

  set(key: string, value: any): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

const settingsCache = new SettingsCache();

/**
 * Get a setting value by key
 * Returns parsed value based on value_type
 */
export async function getSetting<T = any>(
  key: string,
  defaultValue?: T
): Promise<T> {
  // Check cache first
  const cached = settingsCache.get(key);
  if (cached !== null) {
    return cached;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('key', key)
    .single();

  if (error || !data) {
    console.warn(`Setting '${key}' not found, using default value:`, defaultValue);
    return defaultValue as T;
  }

  // Parse value based on type
  let parsedValue: any;
  switch (data.value_type) {
    case 'integer':
      parsedValue = parseInt(data.value, 10);
      break;
    case 'float':
      parsedValue = parseFloat(data.value);
      break;
    case 'boolean':
      parsedValue = data.value === 'true' || data.value === '1';
      break;
    case 'json':
      parsedValue = JSON.parse(data.value);
      break;
    case 'string':
    default:
      parsedValue = data.value;
  }

  // Cache it
  settingsCache.set(key, parsedValue);

  return parsedValue as T;
}

/**
 * Get multiple settings at once
 */
export async function getSettings(keys: string[]): Promise<Record<string, any>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .in('key', keys);

  if (error || !data) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const result: Record<string, any> = {};

  for (const setting of data) {
    let parsedValue: any;
    switch (setting.value_type) {
      case 'integer':
        parsedValue = parseInt(setting.value, 10);
        break;
      case 'float':
        parsedValue = parseFloat(setting.value);
        break;
      case 'boolean':
        parsedValue = setting.value === 'true' || setting.value === '1';
        break;
      case 'json':
        parsedValue = JSON.parse(setting.value);
        break;
      case 'string':
      default:
        parsedValue = setting.value;
    }

    result[setting.key] = parsedValue;
    settingsCache.set(setting.key, parsedValue);
  }

  return result;
}

/**
 * Update a setting value
 * Only admins can do this
 */
export async function updateSetting(
  key: string,
  value: any,
  valueType: 'string' | 'integer' | 'float' | 'boolean' | 'json' = 'string'
): Promise<boolean> {
  const supabase = createClient();

  // Convert value to string for storage
  let stringValue: string;
  if (valueType === 'json') {
    stringValue = JSON.stringify(value);
  } else {
    stringValue = String(value);
  }

  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      key,
      value: stringValue,
      value_type: valueType,
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating setting:', error);
    return false;
  }

  // Clear cache for this key
  settingsCache.cache.delete(key);

  return true;
}

/**
 * Get geolocation radius (in meters) for attendance check-in
 * Default: 60 meters
 */
export async function getGeolocationRadius(): Promise<number> {
  return getSetting<number>('geolocation_radius_meters', 60);
}

/**
 * Get quarter-hour increment (in minutes) for billing
 * Default: 15 minutes
 */
export async function getQuarterHourIncrement(): Promise<number> {
  return getSetting<number>('quarter_hour_increment', 15);
}

/**
 * Get default course fee (in EGP)
 * Default: 0
 */
export async function getDefaultCourseFee(): Promise<number> {
  return getSetting<number>('default_course_fee', 0);
}

/**
 * Get platform name
 * Default: TricksLand Academy
 */
export async function getPlatformName(): Promise<string> {
  return getSetting<string>('platform_name', 'TricksLand Academy');
}

/**
 * Clear all cached settings
 * Call this when settings are updated in admin panel
 */
export function clearSettingsCache(): void {
  settingsCache.clear();
}

/**
 * Initialize default settings (run once on system setup)
 */
export async function initializeDefaultSettings(): Promise<void> {
  const supabase = createClient();

  const defaults: AdminSetting[] = [
    {
      id: '',
      key: 'geolocation_radius_meters',
      value: '60',
      value_type: 'integer',
      description: 'Allowed radius for attendance check-in in meters',
      is_public: false,
      created_at: '',
      updated_at: '',
    },
    {
      id: '',
      key: 'quarter_hour_increment',
      value: '15',
      value_type: 'integer',
      description: 'Billing increment in minutes (quarter hour = 15)',
      is_public: false,
      created_at: '',
      updated_at: '',
    },
    {
      id: '',
      key: 'default_course_fee',
      value: '0',
      value_type: 'float',
      description: 'Default course fee for new students in EGP',
      is_public: false,
      created_at: '',
      updated_at: '',
    },
    {
      id: '',
      key: 'platform_name',
      value: 'TricksLand Academy',
      value_type: 'string',
      description: 'Platform display name',
      is_public: true,
      created_at: '',
      updated_at: '',
    },
  ];

  for (const setting of defaults) {
    // Upsert: if key exists, skip; if not, insert
    await supabase
      .from('admin_settings')
      .upsert(
        {
          key: setting.key,
          value: setting.value,
          value_type: setting.value_type,
          description: setting.description,
          is_public: setting.is_public,
        },
        { onConflict: 'key' }
      );
  }
}
