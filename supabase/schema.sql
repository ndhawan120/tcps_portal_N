-- ============================================================
-- TCPS Professional Development Portal — Database Schema
-- Run this once in Supabase: Project -> SQL Editor -> New query
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users with role/dept info)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  role text not null check (role in ('employee', 'manager', 'admin')) default 'employee',
  department text,
  manager_id uuid references profiles(id),
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamptz not null default now(),
  last_login timestamptz
);

-- 2. PER OBJECTIVES (Practical Experience Requirement tracker)
create table if not exists per_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  objective_number int not null,
  title text not null,
  status text not null check (
    status in ('not_started', 'draft', 'pending_approval', 'approved', 'rejected')
  ) default 'not_started',
  evidence_notes text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, objective_number)
);

-- 3. EXAMS (ACCA exam module tracker)
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_module text not null,
  level text not null check (
    level in ('Applied Knowledge', 'Applied Skills', 'Strategic Professional', 'Essentials')
  ),
  status text not null check (
    status in ('not_started', 'in_progress', 'scheduled', 'passed', 'failed')
  ) default 'not_started',
  exam_date date,
  next_sitting date,
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exam_module)
);

-- 4. APPROVAL HISTORY (audit trail for manager decisions on PER objectives)
create table if not exists approval_history (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references per_objectives(id) on delete cascade,
  actor_id uuid not null references profiles(id),
  action text not null check (action in ('approved', 'rejected', 'requested_changes')),
  comments text,
  created_at timestamptz not null default now()
);

-- 5. ANNOUNCEMENTS (management updates/news visible to everyone)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
alter table per_objectives enable row level security;
alter table exams enable row level security;
alter table approval_history enable row level security;
alter table announcements enable row level security;

-- Helper: current user's role
create or replace function current_role_name() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- PROFILES policies
create policy "View own profile" on profiles for select using (auth.uid() = id);
create policy "Managers view their team" on profiles for select using (manager_id = auth.uid());
create policy "Admins view all profiles" on profiles for select using (current_role_name() = 'admin');
create policy "Admins manage profiles" on profiles for all using (current_role_name() = 'admin');
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- PER OBJECTIVES policies
create policy "Employees manage own objectives" on per_objectives for all
  using (auth.uid() = user_id);
create policy "Managers view team objectives" on per_objectives for select
  using (exists (select 1 from profiles p where p.id = per_objectives.user_id and p.manager_id = auth.uid()));
create policy "Managers approve team objectives" on per_objectives for update
  using (exists (select 1 from profiles p where p.id = per_objectives.user_id and p.manager_id = auth.uid()));
create policy "Admins manage all objectives" on per_objectives for all
  using (current_role_name() = 'admin');

-- EXAMS policies
create policy "Employees manage own exams" on exams for all using (auth.uid() = user_id);
create policy "Managers view team exams" on exams for select
  using (exists (select 1 from profiles p where p.id = exams.user_id and p.manager_id = auth.uid()));
create policy "Admins manage all exams" on exams for all using (current_role_name() = 'admin');

-- APPROVAL HISTORY policies
create policy "View history for own objectives" on approval_history for select
  using (exists (select 1 from per_objectives o where o.id = approval_history.objective_id and o.user_id = auth.uid()));
create policy "Managers view + write team history" on approval_history for all
  using (exists (
    select 1 from per_objectives o
    join profiles p on p.id = o.user_id
    where o.id = approval_history.objective_id and p.manager_id = auth.uid()
  ));
create policy "Admins manage all history" on approval_history for all
  using (current_role_name() = 'admin');

-- ANNOUNCEMENTS policies
create policy "Everyone signed in can view announcements" on announcements
  for select using (auth.uid() is not null);
create policy "Managers and admins can post announcements" on announcements
  for insert with check (current_role_name() in ('manager', 'admin'));
create policy "Authors can delete their own announcements" on announcements
  for delete using (auth.uid() = author_id);
create policy "Admins can delete any announcement" on announcements
  for delete using (current_role_name() = 'admin');

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'New'),
    coalesce(new.raw_user_meta_data->>'last_name', 'User'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
