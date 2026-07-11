DROP POLICY IF EXISTS "temp import monsters" ON public.otserv_monsters;
REVOKE INSERT ON public.otserv_monsters FROM anon;