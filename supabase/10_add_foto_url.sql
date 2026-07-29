ALTER TABLE leituras ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Storage bucket policies (run AFTER creating the bucket 'leituras-fotos' via dashboard or setup endpoint)
-- These allow reading photos (authenticated users) and inserting (own user)
-- CREATE POLICY "leitores_select_own_fotos" ON storage.objects FOR SELECT USING (bucket_id = 'leituras-fotos' AND auth.role() = 'authenticated');
-- CREATE POLICY "leitores_insert_own_fotos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'leituras-fotos' AND auth.uid() = (storage.foldername(name))[1]::uuid);
