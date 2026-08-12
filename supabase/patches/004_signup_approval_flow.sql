-- Run in Supabase SQL Editor once.
-- New registrations start as pending and cannot access the app until approved.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'active', 'rejected', 'inactive'));

alter table public.profiles alter column status set default 'pending';

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'New'),
    coalesce(new.raw_user_meta_data->>'last_name', 'User'),
    coalesce(new.email, ''),
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Existing active users remain active; only future signups are pending.
