CREATE POLICY "game_sprites readable by everyone" ON public.game_sprites FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.game_sprites TO anon;
GRANT SELECT ON public.game_sprites TO authenticated;