
CREATE POLICY "temp import spells" ON public.otserv_spells FOR INSERT TO anon WITH CHECK (public.otserv_temp_import_ok());
CREATE POLICY "temp import actions" ON public.scripts_actions FOR INSERT TO anon WITH CHECK (public.otserv_temp_import_ok());
CREATE POLICY "temp import movements" ON public.scripts_movements FOR INSERT TO anon WITH CHECK (public.otserv_temp_import_ok());
CREATE POLICY "temp import scripts registry" ON public.otserv_scripts_registry FOR INSERT TO anon WITH CHECK (public.otserv_temp_import_ok());
GRANT INSERT ON public.otserv_spells TO anon;
GRANT INSERT ON public.scripts_actions TO anon;
GRANT INSERT ON public.scripts_movements TO anon;
GRANT INSERT ON public.otserv_scripts_registry TO anon;
