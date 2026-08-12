-- Prevent authenticated users from escalating their own privileges or
-- changing account ownership/status fields directly through Supabase.
-- Run after 20260812_security_rls_audit.sql.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
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

  -- Service-role operations (auth/admin backend) are allowed.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins can manage privileged profile fields.
  IF actor_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- A non-admin can update normal profile information only.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'You cannot change account role, status, manager, ID, or email';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;

CREATE TRIGGER protect_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileged_fields();

COMMENT ON FUNCTION public.protect_profile_privileged_fields()
IS 'Prevents non-admin authenticated users from changing role, status, manager, id, or email on their own profile.';
