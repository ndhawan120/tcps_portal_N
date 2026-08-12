-- Run this in Supabase SQL Editor once.
-- PER already has per_objectives_user_objective_unique in the current database.

create unique index if not exists exams_user_exam_module_unique
on public.exams (user_id, exam_module);

-- Add reporting tables to Supabase Realtime only when they are not already present.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'per_objectives') then
    alter publication supabase_realtime add table public.per_objectives;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'exams') then
    alter publication supabase_realtime add table public.exams;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'approval_history') then
    alter publication supabase_realtime add table public.approval_history;
  end if;
end $$;
