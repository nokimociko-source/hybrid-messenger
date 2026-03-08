-- ============================================
-- Storage Policies for Avatars
-- ============================================
-- Добавляет политики для загрузки аватаров в bucket 'media'

-- Сначала убедитесь, что bucket 'media' создан в Supabase Dashboard:
-- Storage > Create new bucket > Name: "media" > Public: true

-- Policy: Разрешить аутентифицированным пользователям загружать аватары
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Policy: Публичный доступ на чтение всех файлов в media
-- (если ещё не создана)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access to media'
  ) THEN
    CREATE POLICY "Public read access to media"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'media');
  END IF;
END $$;

-- Policy: Разрешить пользователям обновлять свои аватары
CREATE POLICY "Users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'avatars'
)
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Policy: Разрешить пользователям удалять свои аватары
CREATE POLICY "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Проверка созданных политик
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;
