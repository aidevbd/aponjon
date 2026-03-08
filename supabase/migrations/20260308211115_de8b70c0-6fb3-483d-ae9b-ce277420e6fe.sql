
-- Function for user to delete their own message via chat session token
CREATE OR REPLACE FUNCTION public.delete_message(p_token text, p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  
  DELETE FROM messages WHERE id = p_message_id AND sender_id = v_contact_id;
  RETURN FOUND;
END;
$$;

-- Function for admin to delete any message in their conversations
CREATE OR REPLACE FUNCTION public.delete_admin_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  
  -- Admin can delete their own messages or messages sent to them
  DELETE FROM messages WHERE id = p_message_id AND (sender_id = v_admin_id OR receiver_id = v_admin_id);
  RETURN FOUND;
END;
$$;
