CREATE POLICY "temp import monsters" ON public.otserv_monsters FOR INSERT TO anon WITH CHECK (public.otserv_temp_import_ok());
GRANT INSERT ON public.otserv_monsters TO anon;