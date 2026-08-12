-- Enable Supabase Realtime for the tables used by portal reporting.
-- Safe to run even when one or more tables are already in the publication.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'profiles',
    'per_objectives',
    'exams',
    'approval_history',
    'announcements'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = target_table
       )
    THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        target_table
      );
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.profiles IS 'TC Group portal profiles; included in Supabase Realtime for reporting refreshes.';
COMMENT ON TABLE public.per_objectives IS 'TC Group PER objectives; included in Supabase Realtime for reporting refreshes.';
COMMENT ON TABLE public.exams IS 'TC Group ACCA exams; included in Supabase Realtime for reporting refreshes.';
COMMENT ON TABLE public.approval_history IS 'TC Group PER approval history; included in Supabase Realtime for reporting refreshes.';
COMMENT ON TABLE public.announcements IS 'TC Group announcements; included in Supabase Realtime for reporting refreshes.';
