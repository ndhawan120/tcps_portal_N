-- Add lifecycle management to custom roles.
-- Employee/Manager/Admin remain the underlying security tiers.

ALTER TABLE public.custom_roles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_custom_roles_is_active
  ON public.custom_roles(is_active);
