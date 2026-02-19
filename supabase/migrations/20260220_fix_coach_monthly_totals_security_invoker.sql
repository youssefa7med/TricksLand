-- Fix: coach_monthly_totals was implicitly created as SECURITY DEFINER by Supabase,
-- which bypasses RLS on the underlying tables. Setting security_invoker = true
-- means the view runs with the CALLING user's privileges, so:
--   - Coaches see only their own rows (sessions RLS: paid_coach_id = auth.uid())
--   - Admins see all rows (their RLS policies allow ALL)

-- Drop and recreate with security_invoker = true (requires PostgreSQL 15+, which Supabase uses)
DROP VIEW IF EXISTS public.coach_monthly_totals;

CREATE VIEW public.coach_monthly_totals
WITH (security_invoker = true)
AS
SELECT
    s.paid_coach_id                         AS coach_id,
    p.full_name                             AS coach_name,
    TO_CHAR(s.session_date, 'YYYY-MM')      AS month,
    COUNT(*)                                AS session_count,
    SUM(s.computed_hours)                   AS total_hours,
    SUM(s.subtotal)                         AS gross_total,
    COALESCE(adj.total_bonuses, 0)          AS total_bonuses,
    COALESCE(adj.total_discounts, 0)        AS total_discounts,
    SUM(s.subtotal)
        + COALESCE(adj.total_bonuses, 0)
        - COALESCE(adj.total_discounts, 0)  AS net_total
FROM sessions s
INNER JOIN profiles p ON p.id = s.paid_coach_id
LEFT JOIN (
    SELECT
        coach_id,
        month,
        SUM(CASE WHEN type = 'bonus'    THEN amount ELSE 0 END) AS total_bonuses,
        SUM(CASE WHEN type = 'discount' THEN amount ELSE 0 END) AS total_discounts
    FROM adjustments
    GROUP BY coach_id, month
) adj ON adj.coach_id = s.paid_coach_id
      AND adj.month = TO_CHAR(s.session_date, 'YYYY-MM')
GROUP BY s.paid_coach_id, p.full_name, TO_CHAR(s.session_date, 'YYYY-MM'),
         adj.total_bonuses, adj.total_discounts;

-- Grant SELECT to authenticated users (RLS on underlying tables handles row filtering)
GRANT SELECT ON public.coach_monthly_totals TO authenticated;
