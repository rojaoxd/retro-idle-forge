
CREATE POLICY "Admins read game-sprites"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'game-sprites' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins upload game-sprites"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-sprites' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update game-sprites"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'game-sprites' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete game-sprites"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'game-sprites' AND public.has_role(auth.uid(),'admin'));
