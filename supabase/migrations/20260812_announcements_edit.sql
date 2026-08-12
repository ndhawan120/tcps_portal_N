-- Announcement editing and realtime support.
-- Safe to run after the announcements table has been created.

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and admins can edit announcements" ON public.announcements;
CREATE POLICY "Managers and admins can edit announcements"
ON public.announcements
FOR UPDATE
USING (
  auth.uid() = author_id
  OR current_role_name() = 'admin'
)
WITH CHECK (
  auth.uid() = author_id
  OR current_role_name() = 'admin'
);

DROP POLICY IF EXISTS "Authors can delete their own announcements" ON public.announcements;
CREATE POLICY "Authors can delete their own announcements"
ON public.announcements
FOR DELETE
USING (auth.uid() = author_id OR current_role_name() = 'admin');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;
