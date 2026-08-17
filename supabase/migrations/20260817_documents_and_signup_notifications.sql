-- Direct employee document/evidence uploads + clearer signup notification destination.

alter table public.per_objectives
  add column if not exists evidence_file_url text;

insert into storage.buckets (id, name, public)
values ('per-evidence', 'per-evidence', false)
on conflict (id) do nothing;

drop policy if exists "Employees can upload own PER evidence" on storage.objects;
drop policy if exists "Employees can read own PER evidence" on storage.objects;
drop policy if exists "Employees can delete own PER evidence" on storage.objects;

create policy "Employees can upload own PER evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'per-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Employees can read own PER evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'per-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Employees can delete own PER evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'per-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Keep signup notifications on the combined Approvals page, but mark them as
-- signup requests so the UI can open/focus the registration section.
create or replace function public.notify_admins_for_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.notifications(user_id, type, title, message, href)
    select p.id, 'signup', 'New signup request',
      coalesce(new.first_name || ' ' || new.last_name, new.email) || ' is waiting for approval.',
      '/approvals?tab=signup'
    from public.profiles p where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end;
$$;
