-- TCPS Portal final integrity migration.
-- Safe to run against an existing database.
-- This file is intentionally idempotent where possible.

-- ============================================================
-- 1. Ensure PER objective uniqueness
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.per_objectives'::regclass
      AND conname = 'per_objectives_user_objective_unique'
  ) THEN
    ALTER TABLE public.per_objectives
      ADD CONSTRAINT per_objectives_user_objective_unique
      UNIQUE (user_id, objective_number);
  END IF;
END $$;

-- ============================================================
-- 2. Ensure exam uniqueness
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.exams'::regclass
      AND conname = 'exams_user_module_unique'
  ) THEN
    ALTER TABLE public.exams
      ADD CONSTRAINT exams_user_module_unique
      UNIQUE (user_id, exam_module);
  END IF;
END $$;

-- ============================================================
-- 3. Keep result values aligned with the application dropdown
-- ============================================================
ALTER TABLE public.exams
  DROP CONSTRAINT IF EXISTS exams_result_check;

ALTER TABLE public.exams
  ADD CONSTRAINT exams_result_check
  CHECK (
    result IS NULL
    OR result IN ('Pass', 'Fail', 'Exempt')
  );

-- ============================================================
-- 4. Helpful indexes for reporting and team lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id
  ON public.profiles(manager_id);

CREATE INDEX IF NOT EXISTS idx_profiles_status_role
  ON public.profiles(status, role);

CREATE INDEX IF NOT EXISTS idx_per_objectives_user_status
  ON public.per_objectives(user_id, status);

CREATE INDEX IF NOT EXISTS idx_per_objectives_status
  ON public.per_objectives(status);

CREATE INDEX IF NOT EXISTS idx_exams_user_status
  ON public.exams(user_id, status);

CREATE INDEX IF NOT EXISTS idx_exams_status
  ON public.exams(status);

-- ============================================================
-- 5. Realtime publication
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'per_objectives'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.per_objectives;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'exams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'approval_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_history;
  END IF;
END $$;

-- ============================================================
-- 6. Secure, atomic PER review function
-- ============================================================
CREATE OR REPLACE FUNCTION public.review_per_objective(
  p_objective_id uuid,
  p_action text,
  p_comments text DEFAULT NULL
)
RETURNS public.per_objectives
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_objective public.per_objectives;
  v_actor_role text;
  v_manager_id uuid;
BEGIN
  SELECT role
    INTO v_actor_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_actor_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Only managers and admins can review PER objectives';
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review action';
  END IF;

  SELECT *
    INTO v_objective
  FROM public.per_objectives
  WHERE id = p_objective_id
    AND status = 'pending_approval';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only pending objectives can be reviewed';
  END IF;

  IF v_actor_role = 'manager' THEN
    SELECT manager_id
      INTO v_manager_id
    FROM public.profiles
    WHERE id = v_objective.user_id;

    IF v_manager_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only review objectives submitted by your team';
    END IF;
  END IF;

  UPDATE public.per_objectives
  SET
    status = p_action,
    approved_at = CASE WHEN p_action = 'approved' THEN now() ELSE NULL END,
    approved_by = CASE WHEN p_action = 'approved' THEN auth.uid() ELSE NULL END,
    updated_at = now()
  WHERE id = p_objective_id
  RETURNING * INTO v_objective;

  INSERT INTO public.approval_history (
    objective_id,
    actor_id,
    action,
    comments
  )
  VALUES (
    p_objective_id,
    auth.uid(),
    p_action,
    NULLIF(trim(p_comments), '')
  );

  RETURN v_objective;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_per_objective(uuid, text, text)
  TO authenticated;

-- ============================================================
-- 7. Correct RLS for PER review workflow
-- ============================================================
DROP POLICY IF EXISTS "Employees manage own objectives" ON public.per_objectives;
DROP POLICY IF EXISTS "Managers approve team objectives" ON public.per_objectives;
DROP POLICY IF EXISTS "Managers approve pending team objectives" ON public.per_objectives;

CREATE POLICY "Employees view own objectives"
  ON public.per_objectives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Employees create own objectives"
  ON public.per_objectives FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('not_started', 'draft', 'pending_approval', 'rejected')
    AND approved_by IS NULL
  );

CREATE POLICY "Employees edit own unapproved objectives"
  ON public.per_objectives FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('not_started', 'draft', 'rejected')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('draft', 'pending_approval', 'rejected')
    AND approved_by IS NULL
  );

CREATE POLICY "Employees delete own unapproved objectives"
  ON public.per_objectives FOR DELETE
  USING (
    auth.uid() = user_id
    AND status IN ('not_started', 'draft', 'rejected')
  );

CREATE POLICY "Managers approve pending team objectives"
  ON public.per_objectives FOR UPDATE
  USING (
    status = 'pending_approval'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = per_objectives.user_id
        AND p.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND approved_by = CASE WHEN status = 'approved' THEN auth.uid() ELSE NULL END
  );

-- Admins keep their existing full-management policy.

-- ============================================================
-- 8. Approval history policies
-- ============================================================
DROP POLICY IF EXISTS "Managers view + write team history" ON public.approval_history;
DROP POLICY IF EXISTS "Managers view team approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Managers insert team approval history" ON public.approval_history;

CREATE POLICY "Managers view team approval history"
  ON public.approval_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.per_objectives o
      JOIN public.profiles p ON p.id = o.user_id
      WHERE o.id = approval_history.objective_id
        AND p.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers insert team approval history"
  ON public.approval_history FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND action IN ('approved', 'rejected')
    AND EXISTS (
      SELECT 1
      FROM public.per_objectives o
      JOIN public.profiles p ON p.id = o.user_id
      WHERE o.id = approval_history.objective_id
        AND p.manager_id = auth.uid()
    )
  );
