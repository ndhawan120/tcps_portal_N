-- PER approval write hardening.
-- The only manager/admin approval path should be the atomic
-- review_per_objective() SECURITY DEFINER function.
-- This prevents a client from directly changing a pending objective to
-- approved/rejected without an approval_history record.

DROP POLICY IF EXISTS "Managers approve pending team objectives" ON public.per_objectives;
DROP POLICY IF EXISTS "Managers approve team objectives" ON public.per_objectives;

-- No manager UPDATE policy is intentionally created here.
-- Employees retain their own edit policy, while managers/admins use the RPC.

COMMENT ON FUNCTION public.review_per_objective(uuid, text, text)
IS 'Atomic PER review path. Managers can review only their assigned employees; admins can review all. Objective update and approval_history insert occur in one transaction.';
