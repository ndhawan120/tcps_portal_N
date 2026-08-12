-- Prevent employees from directly approving/rejecting their own PER objectives.
-- Employees may still create/edit their own draft/submission data.
-- Manager/admin review remains through review_per_objective().

CREATE OR REPLACE FUNCTION public.protect_per_employee_approval_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT role INTO actor_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Backend/service-role operations are allowed.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins/managers may perform review operations. Managers are still
  -- restricted by RLS/RPC to their assigned employees.
  IF actor_role IN ('admin', 'manager') THEN
    RETURN NEW;
  END IF;

  -- Employees can only move their own objective through their submission
  -- states. They cannot mark it approved/rejected or forge review metadata.
  IF NEW.status NOT IN ('not_started', 'draft', 'pending_approval') THEN
    RAISE EXCEPTION 'Employees cannot approve or reject PER objectives';
  END IF;

  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'Employees cannot change PER approval fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_per_employee_approval_fields ON public.per_objectives;

CREATE TRIGGER protect_per_employee_approval_fields
BEFORE UPDATE ON public.per_objectives
FOR EACH ROW
EXECUTE FUNCTION public.protect_per_employee_approval_fields();

COMMENT ON FUNCTION public.protect_per_employee_approval_fields()
IS 'Prevents employees from directly changing PER objectives to approved/rejected or modifying approval metadata.';
