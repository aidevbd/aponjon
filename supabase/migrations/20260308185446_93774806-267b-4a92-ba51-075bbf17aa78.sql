
-- Chat sessions table for verified users
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on chat_sessions" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content text,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "Anyone can view chat images" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');

-- Function: Create chat session after verification
CREATE OR REPLACE FUNCTION public.create_chat_session(p_phone text, p_secret_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contact_id uuid;
  v_hash text;
  v_token text;
  v_name text;
  v_photo text;
BEGIN
  IF NOT public.check_rate_limit(p_phone || ':chat', 'chat_login'::text) THEN
    RETURN json_build_object('success', false, 'error', 'RATE_LIMITED');
  END IF;

  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  
  SELECT id, name, photo_url INTO v_contact_id, v_name, v_photo
  FROM contacts
  WHERE phone = p_phone AND (secret_code_hash = v_hash OR secret_code = p_secret_code);
  
  IF v_contact_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'INVALID');
  END IF;
  
  PERFORM public.reset_rate_limit(p_phone || ':chat', 'chat_login'::text);
  
  DELETE FROM chat_sessions WHERE expires_at < now();
  v_token := encode(extensions.digest((gen_random_uuid()::text || now()::text)::bytea, 'sha256'), 'hex');
  DELETE FROM chat_sessions WHERE contact_id = v_contact_id;
  INSERT INTO chat_sessions (contact_id, session_token) VALUES (v_contact_id, v_token);
  
  RETURN json_build_object('success', true, 'token', v_token, 'contact_id', v_contact_id, 'name', v_name, 'photo_url', v_photo);
END;
$$;

-- Function: Validate session
CREATE OR REPLACE FUNCTION public.validate_chat_session(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  SELECT contact_id INTO v_contact_id FROM chat_sessions WHERE session_token = p_token AND expires_at > now();
  RETURN v_contact_id;
END;
$$;

-- Function: Get chat contacts (only those with secret codes = verified users)
CREATE OR REPLACE FUNCTION public.get_chat_contacts(p_token text)
RETURNS TABLE(id uuid, name text, phone text, photo_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.photo_url
    FROM contacts c
    WHERE c.id != v_contact_id
    AND (c.secret_code_hash IS NOT NULL OR (c.secret_code IS NOT NULL AND c.secret_code != ''))
    ORDER BY c.name;
END;
$$;

-- Function: Send message
CREATE OR REPLACE FUNCTION public.send_message(p_token text, p_receiver_id uuid, p_content text DEFAULT NULL, p_image_url text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_sender_id uuid; v_msg_id uuid;
BEGIN
  v_sender_id := public.validate_chat_session(p_token);
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF p_content IS NULL AND p_image_url IS NULL THEN RAISE EXCEPTION 'Empty message'; END IF;
  
  INSERT INTO messages (sender_id, receiver_id, content, image_url)
  VALUES (v_sender_id, p_receiver_id, p_content, p_image_url)
  RETURNING id INTO v_msg_id;
  
  RETURN v_msg_id;
END;
$$;

-- Function: Get messages between two contacts
CREATE OR REPLACE FUNCTION public.get_messages(p_token text, p_other_id uuid)
RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RETURN; END IF;
  
  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_contact_id AND NOT m.is_read;
  
  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at
    FROM messages m
    WHERE (m.sender_id = v_contact_id AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_contact_id)
    ORDER BY m.created_at ASC;
END;
$$;

-- Function: Get unread counts
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_token text)
RETURNS TABLE(sender_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
    SELECT m.sender_id, count(*)::bigint
    FROM messages m
    WHERE m.receiver_id = v_contact_id AND NOT m.is_read
    GROUP BY m.sender_id;
END;
$$;
