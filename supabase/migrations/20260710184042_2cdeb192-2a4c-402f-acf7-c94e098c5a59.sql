CREATE POLICY "game-sprites files readable by everyone"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'game-sprites');