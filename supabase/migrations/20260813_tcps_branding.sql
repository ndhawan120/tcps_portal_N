-- TC Professional Services portal branding settings and logo storage.
create table if not exists public.portal_settings (
  id boolean primary key default true check (id = true),
  company_name text not null default 'TC Professional Services',
  logo_url text,
  updated_at timestamptz not null default now()
);

alter table public.portal_settings enable row level security;

drop policy if exists "portal_settings_select_authenticated" on public.portal_settings;
create policy "portal_settings_select_authenticated"
  on public.portal_settings for select
  to authenticated
  using (true);

drop policy if exists "portal_settings_admin_insert" on public.portal_settings;
create policy "portal_settings_admin_insert"
  on public.portal_settings for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

drop policy if exists "portal_settings_admin_update" on public.portal_settings;
create policy "portal_settings_admin_update"
  on public.portal_settings for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

insert into public.portal_settings (id, company_name)
values (true, 'TC Professional Services')
on conflict (id) do update set company_name = excluded.company_name, updated_at = now();

-- Public logo bucket: the URL is rendered in the authenticated portal shell.
insert into storage.buckets (id, name, public)
values ('portal-branding', 'portal-branding', true)
on conflict (id) do update set public = true;

drop policy if exists "portal_branding_public_read" on storage.objects;
create policy "portal_branding_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'portal-branding');

drop policy if exists "portal_branding_admin_insert" on storage.objects;
create policy "portal_branding_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portal-branding' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

drop policy if exists "portal_branding_admin_update" on storage.objects;
create policy "portal_branding_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portal-branding' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'))
  with check (bucket_id = 'portal-branding' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));

drop policy if exists "portal_branding_admin_delete" on storage.objects;
create policy "portal_branding_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portal-branding' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));
