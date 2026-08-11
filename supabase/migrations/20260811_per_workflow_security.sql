-- PER workflow hardening and idempotent uniqueness migration.
-- Run this in Supabase SQL Editor against an existing database.

-- 1) Required uniqueness for the 22 objective rows per employee.
-- If this fails with duplicate-key data, remove duplicate rows first.
alter table public.per_objectives
  add constraint per_objectives_user_objective_unique unique (user_id, objective_number);

-- 2) Replace the broad employee PER policy with state-aware policies.
drop policy if exists "Employees manage own objectives" on public.per_objectives;
drop policy if exists "Managers approve team objectives" on public.per_objectives;

create policy "Employees view own objectives" on public.per_objectives
  for select using (auth.uid() = user_id);

create policy "Employees create own objectives" on public.per_objectives
  for insert
  with check (
    auth.uid() = user_id
    and status in ('not_started', 'draft', 'pending_approval', 'rejected')
    and approved_by is null
  );

create policy "Employees edit own unapproved objectives" on public.per_objectives
  for update
  using (
    auth.uid() = user_id
    and status in ('not_started', 'draft', 'rejected')
  )
  with check (
    auth.uid() = user_id
    and status in ('draft', 'pending_approval', 'rejected')
    and approved_by is null
  );

create policy "Employees delete own unapproved objectives" on public.per_objectives
  for delete
  using (
    auth.uid() = user_id
    and status in ('not_started', 'draft', 'rejected')
  );

create policy "Managers approve pending team objectives" on public.per_objectives
  for update
  using (
    status = 'pending_approval'
    and exists (
      select 1 from public.profiles p
      where p.id = per_objectives.user_id
        and p.manager_id = auth.uid()
    )
  )
  with check (
    status in ('approved', 'rejected')
    and approved_by = auth.uid()
  );

-- Admins retain full PER management through the existing admin policy.

-- 3) Approval history should be an audit trail: employees can read their own,
-- managers can read/insert their team's decisions, and only admins can manage all.
drop policy if exists "Managers view + write team history" on public.approval_history;

create policy "Managers view team approval history" on public.approval_history
  for select
  using (
    exists (
      select 1
      from public.per_objectives o
      join public.profiles p on p.id = o.user_id
      where o.id = approval_history.objective_id
        and p.manager_id = auth.uid()
    )
  );

create policy "Managers insert team approval history" on public.approval_history
  for insert
  with check (
    actor_id = auth.uid()
    and action in ('approved', 'rejected', 'requested_changes')
    and exists (
      select 1
      from public.per_objectives o
      join public.profiles p on p.id = o.user_id
      where o.id = approval_history.objective_id
        and p.manager_id = auth.uid()
    )
  );
