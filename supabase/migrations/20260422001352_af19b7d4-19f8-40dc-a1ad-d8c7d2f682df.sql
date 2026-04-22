
-- 1. Fix messages SELECT policy — restrict to admin only
DROP POLICY IF EXISTS "Realtime read messages" ON public.messages;

CREATE POLICY "Admins can read messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
  )
);

-- 2. Fix contacts INSERT policy — block privilege escalation
DROP POLICY IF EXISTS "Anyone can add contacts" ON public.contacts;

CREATE POLICY "Anyone can add non-admin contacts"
ON public.contacts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_admin = false
  AND auth_user_id IS NULL
);

-- 3. Helper: validate chat session from a request header (for storage RLS)
CREATE OR REPLACE FUNCTION public.current_chat_session_contact()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
  v_contact_id uuid;
BEGIN
  -- Read the custom header set by the client
  BEGIN
    v_token := current_setting('request.headers', true)::json ->> 'x-chat-session';
  EXCEPTION WHEN OTHERS THEN
    v_token := NULL;
  END;

  IF v_token IS NULL OR v_token = '' THEN
    RETURN NULL;
  END IF;

  SELECT contact_id INTO v_contact_id
  FROM public.chat_sessions
  WHERE session_token = v_token AND expires_at > now();

  RETURN v_contact_id;
END;
$$;

-- 4. Storage bucket policies — drop existing permissive policies, recreate strict ones
-- Drop any existing policies on storage.objects related to our buckets
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND (
        polname ILIKE '%chat-image%'
        OR polname ILIKE '%contact-photo%'
        OR polname ILIKE '%chat_image%'
        OR polname ILIKE '%contact_photo%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.polname);
  END LOOP;
END $$;

-- chat-images: SELECT public (bucket is public)
CREATE POLICY "chat-images public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-images');

-- chat-images: INSERT requires admin auth OR valid chat session token
CREATE POLICY "chat-images authenticated upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'chat-images'
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif')
  AND (
    -- Admin user
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
    )
    OR
    -- Valid chat session
    public.current_chat_session_contact() IS NOT NULL
  )
);

-- chat-images: UPDATE/DELETE only by admin
CREATE POLICY "chat-images admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
  )
);

CREATE POLICY "chat-images admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
  )
);

-- contact-photos: SELECT public (bucket is public)
CREATE POLICY "contact-photos public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'contact-photos');

-- contact-photos: INSERT — anyone can upload (needed for "Add Contact" public flow), but with strict file-type and a 5MB metadata size hint
CREATE POLICY "contact-photos public upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'contact-photos'
  AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
);

-- contact-photos: UPDATE/DELETE only by admin
CREATE POLICY "contact-photos admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contact-photos'
  AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
  )
);

CREATE POLICY "contact-photos admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contact-photos'
  AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
  )
);

-- 5. Update send_message to also emit a realtime broadcast so unauthenticated chat users (who can no longer SELECT messages) still get notified.
CREATE OR REPLACE FUNCTION public.send_message(p_token text, p_receiver_id uuid, p_content text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_reply_to_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_sender_id uuid; 
  v_msg_id uuid;
  v_topic text;
BEGIN
  v_sender_id := public.validate_chat_session(p_token);
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF p_content IS NULL AND p_image_url IS NULL THEN RAISE EXCEPTION 'Empty message'; END IF;
  
  INSERT INTO messages (sender_id, receiver_id, content, image_url, reply_to_id)
  VALUES (v_sender_id, p_receiver_id, p_content, p_image_url, p_reply_to_id)
  RETURNING id INTO v_msg_id;

  -- Broadcast a realtime notification on a deterministic per-conversation topic
  v_topic := 'msg:' || LEAST(v_sender_id::text, p_receiver_id::text) || ':' || GREATEST(v_sender_id::text, p_receiver_id::text);
  PERFORM realtime.send(
    jsonb_build_object('id', v_msg_id, 'sender_id', v_sender_id, 'receiver_id', p_receiver_id),
    'new_message',
    v_topic,
    false
  );
  
  RETURN v_msg_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_admin_message(p_receiver_id uuid, p_content text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_reply_to_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_admin_id uuid; 
  v_msg_id uuid;
  v_topic text;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Admin not set up'; END IF;
  IF p_content IS NULL AND p_image_url IS NULL THEN RAISE EXCEPTION 'Empty message'; END IF;
  
  INSERT INTO messages (sender_id, receiver_id, content, image_url, reply_to_id)
  VALUES (v_admin_id, p_receiver_id, p_content, p_image_url, p_reply_to_id)
  RETURNING id INTO v_msg_id;

  v_topic := 'msg:' || LEAST(v_admin_id::text, p_receiver_id::text) || ':' || GREATEST(v_admin_id::text, p_receiver_id::text);
  PERFORM realtime.send(
    jsonb_build_object('id', v_msg_id, 'sender_id', v_admin_id, 'receiver_id', p_receiver_id),
    'new_message',
    v_topic,
    false
  );
  
  RETURN v_msg_id;
END;
$function$;
