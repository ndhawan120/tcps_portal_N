-- Friendly employee profile URLs + safe custom role labels.
-- Existing access control remains employee/manager/admin; custom roles inherit one of those access tiers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS custom_role_id uuid;

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  base_role text NOT NULL CHECK (base_role IN ('employee', 'manager', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_unique
  ON public.profiles(profile_slug)
  WHERE profile_slug IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_custom_role_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_custom_role_id_fkey
  FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.make_profile_slug(p_first text, p_last text, p_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_slug text;
BEGIN
  v_slug := lower(trim(both '-' from regexp_replace(
    lower(coalesce(p_first, '') || '-' || coalesce(p_last, '')),
    '[^a-z0-9]+', '-', 'g'
  )));
  IF v_slug = '' THEN
    v_slug := 'user';
  END IF;
  RETURN v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix integer := 1;
BEGIN
  IF NEW.profile_slug IS NOT NULL
     AND NEW.profile_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     AND (TG_OP = 'UPDATE' AND NEW.first_name IS NOT DISTINCT FROM OLD.first_name AND NEW.last_name IS NOT DISTINCT FROM OLD.last_name)
  THEN
    RETURN NEW;
  END IF;

  v_base := public.make_profile_slug(NEW.first_name, NEW.last_name, NEW.id);
  v_candidate := v_base;

  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.profile_slug = v_candidate AND p.id IS DISTINCT FROM NEW.id) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix::text;
  END LOOP;

  NEW.profile_slug := v_candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_profile_slug ON public.profiles;
CREATE TRIGGER profiles_set_profile_slug
BEFORE INSERT OR UPDATE OF first_name, last_name, profile_slug ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_slug();

-- Backfill existing records. Duplicate names receive -2, -3, etc.
DO $$
DECLARE
  r record;
  v_base text;
  v_candidate text;
  v_suffix integer;
BEGIN
  FOR r IN SELECT id, first_name, last_name FROM public.profiles ORDER BY created_at NULLS LAST, id LOOP
    v_base := public.make_profile_slug(r.first_name, r.last_name, r.id);
    v_candidate := v_base;
    v_suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.profile_slug = v_candidate AND p.id IS DISTINCT FROM r.id) LOOP
      v_suffix := v_suffix + 1;
      v_candidate := v_base || '-' || v_suffix::text;
    END LOOP;
    UPDATE public.profiles SET profile_slug = v_candidate WHERE id = r.id AND (profile_slug IS NULL OR profile_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  END LOOP;
END $$;

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view custom roles" ON public.custom_roles;
CREATE POLICY "Authenticated users can view custom roles"
ON public.custom_roles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage custom roles" ON public.custom_roles;
CREATE POLICY "Admins manage custom roles"
ON public.custom_roles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'));

CREATE INDEX IF NOT EXISTS idx_profiles_custom_role_id ON public.profiles(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_slug ON public.profiles(profile_slug);
