
-- Add missing columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_content text DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Update send_admin_message to support reply_to_id
CREATE OR REPLACE FUNCTION public.send_admin_message(p_receiver_id uuid, p_content text DEFAULT NULL, p_image_url text DEFAULT NULL, p_reply_to_id uuid DEFAULT NULL)
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
  
  INSERT INTO messages (sender_id, receiver_id, content, image_url, reply_to_id)
  VALUES (v_admin_id, p_receiver_id, p_content, p_image_url, p_reply_to_id)
  RETURNING id INTO v_msg_id;
  
  RETURN v_msg_id;
END;
$$;

-- Update send_message to support reply_to_id
CREATE OR REPLACE FUNCTION public.send_message(p_token text, p_receiver_id uuid, p_content text DEFAULT NULL, p_image_url text DEFAULT NULL, p_reply_to_id uuid DEFAULT NULL)
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
  
  INSERT INTO messages (sender_id, receiver_id, content, image_url, reply_to_id)
  VALUES (v_sender_id, p_receiver_id, p_content, p_image_url, p_reply_to_id)
  RETURNING id INTO v_msg_id;
  
  RETURN v_msg_id;
END;
$$;

-- Create edit_message for users
CREATE OR REPLACE FUNCTION public.edit_message(p_token text, p_message_id uuid, p_new_content text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  
  UPDATE messages SET
    original_content = CASE WHEN original_content IS NULL THEN content ELSE original_content END,
    content = p_new_content,
    edited_at = now()
  WHERE id = p_message_id AND sender_id = v_contact_id;
  RETURN FOUND;
END;
$$;

-- Create edit_admin_message
CREATE OR REPLACE FUNCTION public.edit_admin_message(p_message_id uuid, p_new_content text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  
  UPDATE messages SET
    original_content = CASE WHEN original_content IS NULL THEN content ELSE original_content END,
    content = p_new_content,
    edited_at = now()
  WHERE id = p_message_id AND sender_id = v_admin_id;
  RETURN FOUND;
END;
$$;

-- Create toggle_pin_message
CREATE OR REPLACE FUNCTION public.toggle_pin_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  
  UPDATE messages SET is_pinned = NOT is_pinned
  WHERE id = p_message_id AND (sender_id = v_admin_id OR receiver_id = v_admin_id);
  RETURN FOUND;
END;
$$;
