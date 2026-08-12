-- Run this in Supabase SQL Editor once.
-- PER already has per_objectives_user_objective_unique in the current database.

-- Prevent duplicate exam records for the same employee/module.
create unique index if not exists exams_user_exam_module_unique
on public.exams (user_id, exam_module);

-- Enable Supabase Realtime for reporting tables.
-- These ALTER statements are safe to run repeatedly only if the table is not already
-- a member of the publication; if your project already added a table, skip that line.

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.per_objectives;
alter publication supabase_realtime add table public.exams;
alter publication supabase_realtime add table public.approval_history;
