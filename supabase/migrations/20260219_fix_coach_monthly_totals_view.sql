-- Fix coach_monthly_totals view: the original LEFT JOIN on adjustments caused
-- each adjustment to be multiplied by the number of sessions in that month.
-- Fixed by pre-aggregating adjustments in a subquery before joining.

CREATE OR REPLACE VIEW coach_monthly_totals AS
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
    -- Pre-aggregate adjustments per coach per month to avoid row multiplication
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
