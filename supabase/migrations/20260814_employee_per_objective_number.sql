-- Employee-owned PER objective number/reference shown to authorised managers and admins.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS per_objective_number text;

COMMENT ON COLUMN public.profiles.per_objective_number
IS 'Employee-entered PER objective number/reference. Employees may maintain it; managers and admins may view it.';
