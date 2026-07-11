-- Policy temporária para permitir bulk import via header x-otserv-import-token
CREATE POLICY "temp import items" ON public.otserv_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.otserv_temp_import_ok());