-- ============================================================================
-- AUTO RATE INCREASE: pg_cron daily job
-- When a coach's next_rate_increase_date arrives:
--   1. Multiply base_hourly_rate by 1.25
--   2. Set rate_effective_from = that date
--   3. Set next_rate_increase_date = +1 year
-- ============================================================================

-- Step 1: Enable pg_cron extension (Supabase supports this)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required by Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- Step 2: Create the function that applies due increases
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_annual_rate_increases()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id, base_hourly_rate, next_rate_increase_date
        FROM profiles
        WHERE
            base_hourly_rate IS NOT NULL
            AND next_rate_increase_date IS NOT NULL
            AND next_rate_increase_date <= CURRENT_DATE
    LOOP
        UPDATE profiles
        SET
            base_hourly_rate       = ROUND(r.base_hourly_rate * 1.25, 2),
            rate_effective_from    = r.next_rate_increase_date,
            next_rate_increase_date = r.next_rate_increase_date + INTERVAL '1 year'
        WHERE id = r.id;

        RAISE NOTICE 'Rate increased for coach %: % → % EGP/hr, next increase: %',
            r.id,
            r.base_hourly_rate,
            ROUND(r.base_hourly_rate * 1.25, 2),
            r.next_rate_increase_date + INTERVAL '1 year';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 3: Schedule the function to run daily at 00:05 (Cairo is UTC+2 → 02:05 UTC)
-- Cron syntax: minute hour day month weekday
-- ============================================================================

-- Remove any existing schedule with the same name first (safe: no-op if not found)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply_annual_rate_increases') THEN
        PERFORM cron.unschedule('apply_annual_rate_increases');
    END IF;
END
$$;

-- Schedule: every day at 00:05 UTC (02:05 Cairo time)
SELECT cron.schedule(
    'apply_annual_rate_increases',   -- job name
    '5 0 * * *',                     -- daily at 00:05 UTC
    'SELECT apply_annual_rate_increases()'
);
