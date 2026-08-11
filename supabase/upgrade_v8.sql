-- ============================================================
-- TCPS Portal v8 Database Upgrade
-- PER approvals + dashboard reporting + exam result validation
-- ============================================================

-- ------------------------------------------------------------
-- 1. PER objective uniqueness
-- One objective per employee.
-- ------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'per_objectives_user_objective_unique'
    ) THEN
        ALTER TABLE public.per_objectives
        ADD CONSTRAINT per_objectives_user_objective_unique
        UNIQUE (user_id, objective_number);
    END IF;
END $$;


-- ------------------------------------------------------------
-- 2. Validate PER status values
-- ------------------------------------------------------------

ALTER TABLE public.per_objectives
DROP CONSTRAINT IF EXISTS per_objectives_status_check;

ALTER TABLE public.per_objectives
ADD CONSTRAINT per_objectives_status_check
CHECK (
    status IN (
        'not_started',
        'draft',
        'pending_approval',
        'approved',
        'rejected'
    )
);


-- ------------------------------------------------------------
-- 3. Validate exam status values
-- ------------------------------------------------------------

ALTER TABLE public.exams
DROP CONSTRAINT IF EXISTS exams_status_check;

ALTER TABLE public.exams
ADD CONSTRAINT exams_status_check
CHECK (
    status IN (
        'not_started',
        'in_progress',
        'scheduled',
        'passed',
        'failed'
    )
);


-- ------------------------------------------------------------
-- 4. Validate exam results
--
-- Result is intentionally nullable because an exam may not
-- have a result yet.
-- ------------------------------------------------------------

ALTER TABLE public.exams
DROP CONSTRAINT IF EXISTS exams_result_check;

ALTER TABLE public.exams
ADD CONSTRAINT exams_result_check
CHECK (
    result IS NULL
    OR result IN (
        'Pass',
        'Fail',
        'Exempt'
    )
);


-- ------------------------------------------------------------
-- 5. Helpful indexes for dashboard reporting
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_per_objectives_user_status
ON public.per_objectives(user_id, status);

CREATE INDEX IF NOT EXISTS idx_per_objectives_status
ON public.per_objectives(status);

CREATE INDEX IF NOT EXISTS idx_exams_user_status
ON public.exams(user_id, status);

CREATE INDEX IF NOT EXISTS idx_exams_status
ON public.exams(status);

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id
ON public.profiles(manager_id);


-- ------------------------------------------------------------
-- 6. PER approval RPC
--
-- This gives the application a controlled way to approve or
-- reject a submitted PER objective.
-- ------------------------------------------------------------

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
    v_employee_manager uuid;
BEGIN

    -- Get current user's role
    SELECT role
    INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    IF v_actor_role NOT IN ('manager', 'admin') THEN
        RAISE EXCEPTION 'Only managers and admins can review PER objectives';
    END IF;


    -- Get objective
    SELECT *
    INTO v_objective
    FROM public.per_objectives
    WHERE id = p_objective_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PER objective not found';
    END IF;


    -- Only pending objectives can be reviewed
    IF v_objective.status <> 'pending_approval' THEN
        RAISE EXCEPTION
            'Only pending objectives can be approved or rejected';
    END IF;


    -- Manager can only review their own team.
    -- Admin can review everybody.
    IF v_actor_role = 'manager' THEN

        SELECT manager_id
        INTO v_employee_manager
        FROM public.profiles
        WHERE id = v_objective.user_id;

        IF v_employee_manager <> auth.uid() THEN
            RAISE EXCEPTION
                'You can only review objectives submitted by your team';
        END IF;

    END IF;


    -- Validate action
    IF p_action NOT IN ('approved', 'rejected', 'requested_changes') THEN
        RAISE EXCEPTION 'Invalid approval action';
    END IF;


    -- Update objective
    UPDATE public.per_objectives
    SET
        status = p_action,
        approved_at =
            CASE
                WHEN p_action = 'approved' THEN now()
                ELSE NULL
            END,
        approved_by =
            CASE
                WHEN p_action = 'approved' THEN auth.uid()
                ELSE NULL
            END,
        updated_at = now()
    WHERE id = p_objective_id
    RETURNING *
    INTO v_objective;


    -- Write audit history
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
        p_comments
    );


    RETURN v_objective;
END;
$$;


-- ------------------------------------------------------------
-- 7. Dashboard: PER status counts
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_per_status_counts()
RETURNS TABLE (
    status text,
    total bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        o.status,
        COUNT(*)::bigint AS total
    FROM public.per_objectives o
    WHERE
        current_role_name() = 'admin'
        OR (
            current_role_name() = 'manager'
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = o.user_id
                AND p.manager_id = auth.uid()
            )
        )
    GROUP BY o.status
    ORDER BY o.status;
$$;


-- ------------------------------------------------------------
-- 8. Dashboard: Exam status counts
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_exam_status_counts()
RETURNS TABLE (
    status text,
    total bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        e.status,
        COUNT(*)::bigint AS total
    FROM public.exams e
    WHERE
        current_role_name() = 'admin'
        OR (
            current_role_name() = 'manager'
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = e.user_id
                AND p.manager_id = auth.uid()
            )
        )
    GROUP BY e.status
    ORDER BY e.status;
$$;


-- ------------------------------------------------------------
-- 9. Dashboard: Exam result counts
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_exam_result_counts()
RETURNS TABLE (
    result text,
    total bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(e.result, 'No Result') AS result,
        COUNT(*)::bigint AS total
    FROM public.exams e
    WHERE
        current_role_name() = 'admin'
        OR (
            current_role_name() = 'manager'
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = e.user_id
                AND p.manager_id = auth.uid()
            )
        )
    GROUP BY COALESCE(e.result, 'No Result')
    ORDER BY result;
$$;


-- ------------------------------------------------------------
-- 10. Dashboard: Pending PER approvals
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_pending_per_approvals()
RETURNS TABLE (
    objective_id uuid,
    employee_id uuid,
    employee_name text,
    objective_number integer,
    objective_title text,
    evidence_notes text,
    submitted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        o.id,
        p.id,
        CONCAT(p.first_name, ' ', p.last_name),
        o.objective_number,
        o.title,
        o.evidence_notes,
        o.submitted_at
    FROM public.per_objectives o
    JOIN public.profiles p
        ON p.id = o.user_id
    WHERE
        o.status = 'pending_approval'
        AND (
            current_role_name() = 'admin'
            OR (
                current_role_name() = 'manager'
                AND p.manager_id = auth.uid()
            )
        )
    ORDER BY o.submitted_at ASC;
$$;


-- ------------------------------------------------------------
-- 11. Permissions
-- ------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.review_per_objective(uuid, text, text)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_per_status_counts()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_exam_status_counts()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_exam_result_counts()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_pending_per_approvals()
TO authenticated;