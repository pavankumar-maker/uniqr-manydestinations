
ALTER TABLE public.qr_codes ALTER COLUMN target_url DROP NOT NULL;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS file_mime text;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS file_name text;

CREATE POLICY "Users upload own qr files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qr-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own qr files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'qr-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own qr files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qr-files' AND (storage.foldername(name))[1] = auth.uid()::text);
