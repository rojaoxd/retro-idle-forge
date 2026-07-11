
DROP POLICY IF EXISTS "temp import spells" ON public.otserv_spells;
DROP POLICY IF EXISTS "temp import actions" ON public.scripts_actions;
DROP POLICY IF EXISTS "temp import movements" ON public.scripts_movements;
DROP POLICY IF EXISTS "temp import scripts registry" ON public.otserv_scripts_registry;
REVOKE INSERT ON public.otserv_spells FROM anon;
REVOKE INSERT ON public.scripts_actions FROM anon;
REVOKE INSERT ON public.scripts_movements FROM anon;
REVOKE INSERT ON public.otserv_scripts_registry FROM anon;
