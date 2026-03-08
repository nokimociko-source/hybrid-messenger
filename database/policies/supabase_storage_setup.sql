-- ============================================
-- Supabase Storage Setup for Stickers
-- ============================================
-- This script creates the 'media' bucket and sets up storage policies
-- Run this in Supabase SQL Editor after creating the bucket manually

-- Note: Buckets must be created via Supabase Dashboard or CLI first
-- Dashboard: Storage > Create new bucket > Name: "media" > Public: true

-- ============================================
-- Storage Policies for 'media' bucket
-- ============================================

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'stickers'
);

-- Policy: Allow public read access to all media files
CREATE POLICY "Public read access to media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media');

-- Policy: Allow users to update their own uploaded files
CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- Alternative: If you want to restrict uploads to sticker packs only
-- ============================================

-- This policy ensures users can only upload to sticker packs they own
CREATE POLICY "Users can upload to their sticker packs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'stickers' AND
  EXISTS (
    SELECT 1 FROM user_sticker_packs usp
    JOIN sticker_packs sp ON sp.id = usp.pack_id
    WHERE usp.user_id = auth.uid()
    AND sp.id::text = (storage.foldername(name))[2]
  )
);
