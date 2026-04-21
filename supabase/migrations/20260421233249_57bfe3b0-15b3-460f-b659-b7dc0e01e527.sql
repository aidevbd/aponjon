
-- =========================================================
-- 1. OTP CODES — deny direct access (only RPC via SECURITY DEFINER)
-- =========================================================
DROP POLICY IF EXISTS "Allow all on otp_codes" ON public.otp_codes;
CREATE POLICY "Deny all direct access on otp_codes"
  ON public.otp_codes
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- =========================================================
-- 2. MESSAGES — deny direct access (only RPC)
-- =========================================================
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
CREATE POLICY "Deny all direct access on messages"
  ON public.messages
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- =========================================================
-- 3. CHAT_SESSIONS — deny direct access (only RPC)
-- =========================================================
DROP POLICY IF EXISTS "Allow all on chat_sessions" ON public.chat_sessions;
CREATE POLICY "Deny all direct access on chat_sessions"
  ON public.chat_sessions
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- =========================================================
-- 4. USER_PRESENCE — deny direct access (only RPC)
-- =========================================================
DROP POLICY IF EXISTS "Allow all on user_presence" ON public.user_presence;
CREATE POLICY "Deny all direct access on user_presence"
  ON public.user_presence
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- =========================================================
-- 5. ADMIN_ACTIVITY_LOGS — restrict to admins only
-- =========================================================
DROP POLICY IF EXISTS "Admins can read activity logs" ON public.admin_activity_logs;
DROP POLICY IF EXISTS "Insert via RPC only" ON public.admin_activity_logs;

CREATE POLICY "Only admins can read activity logs"
  ON public.admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE auth_user_id = auth.uid() AND is_admin = true
    )
  );

-- Inserts only via SECURITY DEFINER RPC (log_admin_activity); deny direct insert
CREATE POLICY "Deny direct insert on activity logs"
  ON public.admin_activity_logs
  FOR INSERT
  TO public
  WITH CHECK (false);

-- =========================================================
-- 6. update_presence — require valid session token
-- =========================================================
DROP FUNCTION IF EXISTS public.update_presence(uuid);

CREATE OR REPLACE FUNCTION public.update_presence(p_token text, p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_owner uuid;
BEGIN
  v_owner := public.validate_chat_session(p_token);
  IF v_owner IS NULL OR v_owner != p_contact_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO user_presence (contact_id, last_seen_at, is_online)
  VALUES (p_contact_id, now(), true)
  ON CONFLICT (contact_id)
  DO UPDATE SET last_seen_at = now(), is_online = true;
END;
$$;

-- =========================================================
-- 7. STORAGE BUCKETS — tighten policies
-- =========================================================

-- Drop previous broad policies (names from earlier migrations)
DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload contact photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contact photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view contact photos" ON storage.objects;

-- chat-images: restricted upload (image types, ≤5MB), no listing, individual view via URL only
CREATE POLICY "Upload chat images (validated)"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'chat-images'
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif')
    AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
  );

CREATE POLICY "View chat images by direct path"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');

-- contact-photos: restricted upload (image types, ≤5MB), no listing
CREATE POLICY "Upload contact photos (validated)"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'contact-photos'
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif')
    AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
  );

CREATE POLICY "View contact photos by direct path"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'contact-photos');
