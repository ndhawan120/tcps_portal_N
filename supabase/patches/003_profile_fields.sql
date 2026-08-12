-- Run in Supabase SQL Editor once.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists joining_date date;
alter table public.profiles add column if not exists avatar_url text;
