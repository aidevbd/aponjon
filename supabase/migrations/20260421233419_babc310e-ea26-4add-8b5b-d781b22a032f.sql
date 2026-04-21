
-- Remove SELECT policies that allow listing all files in storage buckets.
-- Buckets are public, so direct file URLs still work without a SELECT policy.
DROP POLICY IF EXISTS "View chat images by direct path" ON storage.objects;
DROP POLICY IF EXISTS "View contact photos by direct path" ON storage.objects;

-- Tighten contacts UPDATE/DELETE: authenticated only AND must be linked admin contact
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

CREATE POLICY "Admins can update contacts"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
    )
  );

CREATE POLICY "Admins can delete contacts"
  ON public.contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
    )
  );
