
DROP POLICY IF EXISTS "anyone read proofs" ON storage.objects;

CREATE POLICY "users read own proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
