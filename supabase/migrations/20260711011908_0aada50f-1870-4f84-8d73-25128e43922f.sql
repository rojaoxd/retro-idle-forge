DROP POLICY IF EXISTS "temp import items" ON public.otserv_items;
REVOKE INSERT ON public.otserv_items FROM anon;