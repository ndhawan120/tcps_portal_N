-- Final RBAC/employee slug foundation.
-- Keeps the existing employee/manager/admin role model backward compatible while
-- adding safe, unique employee profile slugs for user-facing URLs.

alter table public.profiles
  add column if not exists profile_slug text;

create unique index if not exists profiles_profile_slug_unique
  on public.profiles (profile_slug)
  where profile_slug is not null;

create or replace function public.make_profile_slug(p_name text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

-- Backfill missing slugs. The numeric suffix is deliberately only used when
-- two people have the same normalized name; UUID remains internal.
do $$
declare
  r record;
  base_slug text;
  candidate text;
  n integer;
begin
  for r in
    select id, trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as full_name
    from public.profiles
    where profile_slug is null
  loop
    base_slug := public.make_profile_slug(r.full_name);
    if base_slug is null then
      base_slug := 'user';
    end if;
    candidate := base_slug;
    n := 1;
    while exists (select 1 from public.profiles p where p.profile_slug = candidate and p.id <> r.id) loop
      n := n + 1;
      candidate := base_slug || '-' || n::text;
    end loop;
    update public.profiles set profile_slug = candidate where id = r.id;
  end loop;
end $$;

create or replace function public.set_profile_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  n integer;
begin
  if new.profile_slug is not null and new.profile_slug <> '' then
    new.profile_slug := regexp_replace(lower(new.profile_slug), '[^a-z0-9-]', '', 'g');
    new.profile_slug := regexp_replace(new.profile_slug, '-+', '-', 'g');
    new.profile_slug := trim(both '-' from new.profile_slug);
  else
    base_slug := public.make_profile_slug(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')));
    if base_slug is null then base_slug := 'user'; end if;
    candidate := base_slug;
    n := 1;
    while exists (select 1 from public.profiles p where p.profile_slug = candidate and p.id <> new.id) loop
      n := n + 1;
      candidate := base_slug || '-' || n::text;
    end loop;
    new.profile_slug := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_profile_slug_trigger on public.profiles;
create trigger profiles_profile_slug_trigger
before insert or update of profile_slug, first_name, last_name on public.profiles
for each row execute function public.set_profile_slug();

-- Roles remain employee/manager/admin until permissions are explicitly defined
-- by the application. This prevents an arbitrary new role from accidentally
-- receiving elevated access.
