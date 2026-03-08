
-- Fix delete_message to soft delete instead of hard delete
CREATE OR REPLACE FUNCTION public.delete_message(p_token text, p_message_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  
  UPDATE messages SET deleted_by_sender = true WHERE id = p_message_id AND sender_id = v_contact_id;
  RETURN FOUND;
END;
$function$;

-- Fix get_messages to hide soft-deleted messages from user
CREATE OR REPLACE FUNCTION public.get_messages(p_token text, p_other_id uuid)
 RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RETURN; END IF;
  
  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_contact_id AND NOT m.is_read;
  
  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at
    FROM messages m
    WHERE ((m.sender_id = v_contact_id AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_contact_id))
      AND NOT m.deleted_by_sender
    ORDER BY m.created_at ASC;
END;
$function$;
