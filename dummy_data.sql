-- ============================================================
-- DUMMY DATA — paste into Supabase SQL Editor and run
-- Replace 'YOUR-USER-ID' with your own id from the profiles table
-- (Table Editor -> profiles -> copy the "id" column value for your row)
-- ============================================================

-- Sample PER objectives for yourself
insert into per_objectives (user_id, objective_number, title, status, evidence_notes) values
  ('YOUR-USER-ID', 1, 'Business and organisational environment', 'approved', 'Completed via client audit rotation'),
  ('YOUR-USER-ID', 5, 'Leadership and management', 'pending_approval', 'Led team of 3 on year-end close'),
  ('YOUR-USER-ID', 9, 'Manage self', 'draft', null),
  ('YOUR-USER-ID', 14, 'Prepare financial statements', 'not_started', null);

-- Sample exams for yourself
insert into exams (user_id, exam_module, level, status, next_sitting, result) values
  ('YOUR-USER-ID', 'Strategic Business Leader', 'Strategic Professional', 'scheduled', '2026-09-08', null),
  ('YOUR-USER-ID', 'Governance, Risk and Control', 'Strategic Professional', 'passed', null, 'Pass'),
  ('YOUR-USER-ID', 'Financial Management', 'Applied Skills', 'passed', null, 'Pass'),
  ('YOUR-USER-ID', 'Taxation', 'Applied Skills', 'in_progress', null, null);

-- Refresh your dashboard afterwards to see live numbers instead of zeros.
