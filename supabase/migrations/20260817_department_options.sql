-- Keep the Admin Office Directory department dropdown aligned with the full portal department list.
insert into public.departments (name, is_active)
values
  ('Audit & Assurance', true),
  ('Tax', true),
  ('Corporate Finance', true),
  ('Business Advisory', true),
  ('Bookkeeping', true),
  ('Payroll', true),
  ('Wealth Management', true),
  ('HR', true),
  ('Marketing', true),
  ('IT', true),
  ('Operations', true),
  ('Other', true)
on conflict (name) do update set is_active = excluded.is_active;
