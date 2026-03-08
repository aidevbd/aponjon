
-- Add is_admin and auth_user_id columns to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- Update get_chat_contacts to only return admin contacts
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
    WHERE c.is_admin = true AND c.id != v_contact_id
    ORDER BY c.name;
END;
$$;

-- Helper: get admin's contact_id from auth
CREATE OR REPLACE FUNCTION public.get_admin_contact_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM contacts WHERE auth_user_id = auth.uid() AND is_admin = true LIMIT 1;
  RETURN v_id;
END;
$$;

-- Setup admin contact (link auth user to a contact or create one)
CREATE OR REPLACE FUNCTION public.setup_admin_contact(p_name text, p_phone text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  -- Check if already linked
  SELECT id INTO v_id FROM contacts WHERE auth_user_id = auth.uid() AND is_admin = true;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  
  -- Create admin contact
  INSERT INTO contacts (name, phone, is_admin, auth_user_id)
  VALUES (p_name, COALESCE(p_phone, 'admin'), true, auth.uid())
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Get all users who have conversations with admin
CREATE OR REPLACE FUNCTION public.get_admin_chat_users()
RETURNS TABLE(id uuid, name text, phone text, photo_url text, last_message_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.photo_url,
      (SELECT MAX(m.created_at) FROM messages m 
       WHERE (m.sender_id = c.id AND m.receiver_id = v_admin_id) 
          OR (m.sender_id = v_admin_id AND m.receiver_id = c.id)) as last_message_at
    FROM contacts c
    WHERE c.id IN (
      SELECT m.sender_id FROM messages m WHERE m.receiver_id = v_admin_id
      UNION
      SELECT m.receiver_id FROM messages m WHERE m.sender_id = v_admin_id
    )
    AND c.id != v_admin_id
    ORDER BY last_message_at DESC NULLS LAST;
END;
$$;

-- Get messages between admin and a user
CREATE OR REPLACE FUNCTION public.get_admin_messages(p_other_id uuid)
RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RETURN; END IF;
  
  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_admin_id AND NOT m.is_read;
  
  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at
    FROM messages m
    WHERE (m.sender_id = v_admin_id AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_admin_id)
    ORDER BY m.created_at ASC;
END;
$$;

-- Send message as admin
CREATE OR REPLACE FUNCTION public.send_admin_message(p_receiver_id uuid, p_content text DEFAULT NULL, p_image_url text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid; v_msg_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Admin not set up'; END IF;
  IF p_content IS NULL AND p_image_url IS NULL THEN RAISE EXCEPTION 'Empty message'; END IF;
  
  INSERT INTO messages (sender_id, receiver_id, content, image_url)
  VALUES (v_admin_id, p_receiver_id, p_content, p_image_url)
  RETURNING id INTO v_msg_id;
  
  RETURN v_msg_id;
END;
$$;

-- Get unread counts for admin
CREATE OR REPLACE FUNCTION public.get_admin_unread_counts()
RETURNS TABLE(sender_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
    SELECT m.sender_id, count(*)::bigint
    FROM messages m
    WHERE m.receiver_id = v_admin_id AND NOT m.is_read
    GROUP BY m.sender_id;
END;
$$;
