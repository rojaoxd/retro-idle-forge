CREATE OR REPLACE FUNCTION public.otserv_temp_import_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (NULLIF(current_setting('request.headers', true), '')::jsonb ->> 'x-otserv-import-token') = '7f8d2fe0-4367-4478-bba5-2cc1f6bb4624',
    false
  );
$$;

GRANT SELECT, INSERT, UPDATE ON public.otserv_world_tiles TO anon;

DROP POLICY IF EXISTS "temporary world tile import select" ON public.otserv_world_tiles;
DROP POLICY IF EXISTS "temporary world tile import insert" ON public.otserv_world_tiles;
DROP POLICY IF EXISTS "temporary world tile import update" ON public.otserv_world_tiles;

CREATE POLICY "temporary world tile import select"
ON public.otserv_world_tiles
FOR SELECT
TO anon
USING (public.otserv_temp_import_ok());

CREATE POLICY "temporary world tile import insert"
ON public.otserv_world_tiles
FOR INSERT
TO anon
WITH CHECK (public.otserv_temp_import_ok());

CREATE POLICY "temporary world tile import update"
ON public.otserv_world_tiles
FOR UPDATE
TO anon
USING (public.otserv_temp_import_ok())
WITH CHECK (public.otserv_temp_import_ok());