-- ============================================================
-- OPTIONAL: Example seed data.
-- Run this AFTER you've created at least one real user by logging in once
-- (so a row exists in profiles). Replace 'YOUR-USER-UUID-HERE' with that
-- user's id, found in Supabase -> Authentication -> Users.
-- ============================================================

-- insert into per_objectives (user_id, objective_number, title, status) values
--   ('YOUR-USER-UUID-HERE', 1, 'Business and organisational environment', 'approved'),
--   ('YOUR-USER-UUID-HERE', 5, 'Leadership and management', 'pending_approval'),
--   ('YOUR-USER-UUID-HERE', 12, 'Evidence Uploaded for Objective 12', 'draft'),
--   ('YOUR-USER-UUID-HERE', 14, 'Resume Objective 14', 'not_started');

-- insert into exams (user_id, exam_module, level, status, next_sitting) values
--   ('YOUR-USER-UUID-HERE', 'Strategic Business Leader', 'Strategic Professional', 'scheduled', '2026-09-08'),
--   ('YOUR-USER-UUID-HERE', 'Governance, Risk and Control', 'Strategic Professional', 'passed', null);

-- To make someone a manager: update profiles set role = 'manager' where id = 'THEIR-UUID';
-- To assign an employee to a manager: update profiles set manager_id = 'MANAGER-UUID' where id = 'EMPLOYEE-UUID';
-- To make the first admin: update profiles set role = 'admin' where email = 'you@tc-group.com';
