-- Fix course_financial_summary view:
-- 1. Remove incorrect SUM(DISTINCT ...) — DISTINCT removes duplicate VALUES, not duplicate rows.
--    E.g. if 3 students each paid 1000 EGP, SUM(DISTINCT amount_paid) = 1000 instead of 3000.
-- 2. Count total_students from course_students (enrolled count), not student_payments.
-- 3. Simplify COUNT(DISTINCT CASE...) → COUNT(CASE...1) which is cleaner and correct.

DROP VIEW IF EXISTS public.course_financial_summary;

CREATE VIEW public.course_financial_summary
WITH (security_invoker = true)
AS
SELECT
    c.id                                                  AS course_id,
    c.name                                                AS course_name,
    COALESCE(SUM(sp.course_fee), 0)                       AS total_course_fees,
    COALESCE(SUM(sp.amount_paid), 0)                      AS total_income,
    COALESCE(SUM(sp.remaining_balance), 0)                AS pending_income,
    COALESCE(
        (SELECT SUM(ce2.amount) FROM course_expenses ce2 WHERE ce2.course_id = c.id),
    0)                                                    AS total_expenses,
    COALESCE(SUM(sp.amount_paid), 0) -
    COALESCE(
        (SELECT SUM(ce2.amount) FROM course_expenses ce2 WHERE ce2.course_id = c.id),
    0)                                                    AS net_profit,
    -- Use actual enrolled count from course_students, not just those with payment records
    COALESCE(
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_id = c.id),
    0)                                                    AS total_students,
    COUNT(CASE WHEN sp.payment_status = 'paid'         THEN 1 END) AS students_paid,
    COUNT(CASE WHEN sp.payment_status = 'partially_paid' THEN 1 END) AS students_partially_paid,
    COUNT(CASE WHEN sp.payment_status = 'not_paid'     THEN 1 END) AS students_not_paid
FROM courses c
LEFT JOIN student_payments sp ON c.id = sp.course_id
GROUP BY c.id, c.name;

GRANT SELECT ON public.course_financial_summary TO authenticated;
