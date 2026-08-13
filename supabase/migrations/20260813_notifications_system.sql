create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  href text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_href text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notifications(user_id, type, title, message, href)
  values (p_user_id, p_type, p_title, p_message, p_href);
end;
$$;

create or replace function public.notify_admins_for_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.notifications(user_id, type, title, message, href)
    select p.id, 'signup', 'New signup request', coalesce(new.first_name || ' ' || new.last_name, new.email) || ' is waiting for approval.', '/approvals'
    from public.profiles p where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_signup_notification on public.profiles;
create trigger profiles_signup_notification after insert or update of status on public.profiles for each row execute function public.notify_admins_for_signup();

create or replace function public.notify_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, type, title, message, href)
  select p.id, 'announcement', 'New update', new.title, '/announcements'
  from public.profiles p where p.status = 'active' and p.id <> new.author_id;
  return new;
end;
$$;

drop trigger if exists announcements_notification on public.announcements;
create trigger announcements_notification after insert on public.announcements for each row execute function public.notify_announcement();

create or replace function public.notify_per_objective()
returns trigger language plpgsql security definer set search_path = public as $$
declare employee_name text;
begin
  select coalesce(first_name || ' ' || last_name, email) into employee_name from public.profiles where id = new.user_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.notifications(user_id, type, title, message, href)
    select p.id, 'approval', 'PER approval requested', employee_name || ' submitted a PER objective for approval.', '/approvals'
    from public.profiles p where p.status = 'active' and (p.role = 'admin' or p.id = (select manager_id from public.profiles where id = new.user_id));
  elsif new.status in ('approved','rejected') and old.status is distinct from new.status then
    perform public.create_notification(new.user_id, 'approval', case when new.status = 'approved' then 'PER objective approved' else 'PER objective rejected' end, case when new.status = 'approved' then 'Your PER objective has been approved.' else 'Your PER objective has been rejected.' end, '/progress');
  end if;
  return new;
end;
$$;

drop trigger if exists per_objectives_notification on public.per_objectives;
create trigger per_objectives_notification after insert or update of status on public.per_objectives for each row execute function public.notify_per_objective();

create or replace function public.notify_exam_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare employee_name text;
begin
  select coalesce(first_name || ' ' || last_name, email) into employee_name from public.profiles where id = new.user_id;
  if tg_op = 'INSERT' or old.status is distinct from new.status or old.result is distinct from new.result then
    if new.status in ('scheduled','in progress','passed','failed') or new.result is not null then
      perform public.create_notification(new.user_id, 'exam', 'Exam update', 'Your exam status or result has been updated.', '/progress');
      insert into public.notifications(user_id, type, title, message, href)
      select p.id, 'exam', 'Team exam update', employee_name || ' has an exam status or result update.', '/manager'
      from public.profiles p where p.id = (select manager_id from public.profiles where id = new.user_id) and p.status = 'active';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exams_notification on public.exams;
create trigger exams_notification after insert or update of status, result on public.exams for each row execute function public.notify_exam_change();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      alter publication supabase_realtime add table public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
