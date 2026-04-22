
-- Public buckets serve files via public URLs without needing a SELECT policy.
-- Removing the broad SELECT policies prevents clients from listing the entire bucket.
DROP POLICY IF EXISTS "chat-images public read" ON storage.objects;
DROP POLICY IF EXISTS "contact-photos public read" ON storage.objects;
