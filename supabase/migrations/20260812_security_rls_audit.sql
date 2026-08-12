-- TCPS Portal security/RLS hardening.
-- Run this migration in Supabase SQL Editor after the final_integrity migration.
-- Safe to re-run: policies are dropped/recreated.

-- ---------------------------------------------------------------------------
-- PER OBJECTIVES
-- Employees: own records only.
-- Managers: read their team's records; review is performed through the
-- SECURITY DEFINER review_per_objective() function.
-- Admins: read all records. Admin review is also performed through the function.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Managers view team objectives" ON public.per_objectives;
DROP POLICY IF EXISTS "Admins view all objectives" ON public.per_objectives;
DROP POLICY IF EXISTS "Managers approve pending team objectives" ON public.per_objectives;

CREATE POLICY "Managers view team objectives"
ON public.per_objectives
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = per_objectives.user_id
      AND p.manager_id = auth.uid()
      AND p.role = 'employee'
  )
);

CREATE POLICY "Admins view all objectives"
ON public.per_objectives
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
  )
);

-- Keep direct manager UPDATE capability restricted to pending team objectives.
-- The application uses review_per_objective() for approval/rejection so that
-- the objective and approval_history are written atomically.
CREATE POLICY "Managers approve pending team objectives"
ON public.per_objectives
FOR UPDATE
USING (
  status = 'pending_approval'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = per_objectives.user_id
      AND p.manager_id = auth.uid()
      AND p.role = 'employee'
  )
)
WITH CHECK (
  status IN ('approved', 'rejected')
  AND approved_by = CASE
    WHEN status = 'approved' THEN auth.uid()
    ELSE NULL
  END
);

-- ---------------------------------------------------------------------------
-- APPROVAL HISTORY
-- Managers can see only their team's history.
-- Admins can see all history.
-- Direct writes are restricted; normal review operations should use the RPC.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Managers view team approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Managers insert team approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Admins view all approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Admins insert approval history" ON public.approval_history;

CREATE POLICY "Managers view team approval history"
ON public.approval_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.per_objectives o
    JOIN public.profiles p ON p.id = o.user_id
    WHERE o.id = approval_history.objective_id
      AND p.manager_id = auth.uid()
      AND p.role = 'employee'
  )
);

CREATE POLICY "Admins view all approval history"
ON public.approval_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
  )
);

-- ---------------------------------------------------------------------------
-- COMMENTS / NOTES
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.review_per_objective(uuid, text, text)
IS 'Atomically approves or rejects a pending PER objective and records approval history. Managers are restricted to their assigned employees; admins can review all employees.';
