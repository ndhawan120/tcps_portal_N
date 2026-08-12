-- Department management for Admin > Roles & Access.
-- Keeps profiles.department as text for backwards compatibility.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists departments_name_lower_unique
  on public.departments (lower(name));

alter table public.departments enable row level security;

drop policy if exists "departments_select_authenticated" on public.departments;
create policy "departments_select_authenticated"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "departments_admin_insert" on public.departments;
create policy "departments_admin_insert"
  on public.departments for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

drop policy if exists "departments_admin_update" on public.departments;
create policy "departments_admin_update"
  on public.departments for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

drop policy if exists "departments_admin_delete" on public.departments;
create policy "departments_admin_delete"
  on public.departments for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

insert into public.departments (name, slug)
values
  ('Audit & Assurance', 'audit-assurance'),
  ('Tax', 'tax'),
  ('Corporate Finance', 'corporate-finance'),
  ('Business Advisory', 'business-advisory'),
  ('Bookkeeping', 'bookkeeping'),
  ('Payroll', 'payroll'),
  ('Wealth Management', 'wealth-management'),
  ('HR', 'hr'),
  ('Marketing', 'marketing'),
  ('IT', 'it'),
  ('Operations', 'operations'),
  ('Other', 'other')
on conflict (slug) do nothing;

create or replace function public.set_departments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists departments_updated_at on public.departments;
create trigger departments_updated_at
before update on public.departments
for each row execute function public.set_departments_updated_at();
