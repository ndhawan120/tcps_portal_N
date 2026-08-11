-- ============================================================
-- FIX: the new-user trigger couldn't find the profiles table
-- because it wasn't schema-qualified. Run this in SQL Editor.
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

-- The trigger itself doesn't need to change, but re-create it just in case:
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
