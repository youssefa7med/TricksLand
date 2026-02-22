-- Enforce that a payment transaction cannot exceed the remaining balance.
-- This is a database-level backstop in addition to UI validation.

CREATE OR REPLACE FUNCTION check_payment_does_not_exceed_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining NUMERIC;
BEGIN
    SELECT remaining_balance INTO v_remaining
    FROM student_payments
    WHERE id = NEW.payment_record_id;

    IF NEW.amount > v_remaining THEN
        RAISE EXCEPTION 'Payment amount (%) exceeds remaining balance (%)',
            NEW.amount, v_remaining;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_payment_limit ON payment_transactions;
CREATE TRIGGER trigger_check_payment_limit
    BEFORE INSERT ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION check_payment_does_not_exceed_balance();
