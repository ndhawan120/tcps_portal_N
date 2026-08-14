alter table public.announcements alter column author_id drop not null;
alter table public.announcements add column if not exists source_type text not null default 'tcps' check (source_type in ('tcps','acca'));
alter table public.announcements add column if not exists source_url text;
alter table public.announcements add column if not exists published_at timestamptz;
alter table public.announcements add column if not exists external_id text;
alter table public.announcements add column if not exists excerpt text;
create unique index if not exists announcements_source_external_id_uidx on public.announcements(source_type, external_id) where external_id is not null;
create index if not exists announcements_source_type_created_at_idx on public.announcements(source_type, created_at desc);
