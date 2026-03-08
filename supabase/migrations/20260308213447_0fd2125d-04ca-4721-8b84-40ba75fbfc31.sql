
-- Drop old functions with different return types
DROP FUNCTION IF EXISTS public.get_messages(text, uuid);
DROP FUNCTION IF EXISTS public.get_admin_messages(uuid);

-- Recreate get_messages with new fields
CREATE OR REPLACE FUNCTION public.get_messages(p_token text, p_other_id uuid)
RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamptz, edited_at timestamptz, original_content text, reply_to_id uuid, reply_content text, reply_sender_id uuid, is_pinned boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_contact_id uuid;
BEGIN
  v_contact_id := public.validate_chat_session(p_token);
  IF v_contact_id IS NULL THEN RETURN; END IF;
  
  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_contact_id AND NOT m.is_read;
  
  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at,
      m.edited_at, m.original_content, m.reply_to_id,
      r.content as reply_content, r.sender_id as reply_sender_id, m.is_pinned
    FROM messages m
    LEFT JOIN messages r ON r.id = m.reply_to_id
    WHERE ((m.sender_id = v_contact_id AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_contact_id))
      AND NOT m.deleted_by_sender
    ORDER BY m.created_at ASC;
END;
$$;

-- Recreate get_admin_messages with new fields
CREATE OR REPLACE FUNCTION public.get_admin_messages(p_other_id uuid)
RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamptz, deleted_by_sender boolean, edited_at timestamptz, original_content text, reply_to_id uuid, reply_content text, reply_sender_id uuid, is_pinned boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RETURN; END IF;
  
  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_admin_id AND NOT m.is_read;
  
  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at,
      m.deleted_by_sender, m.edited_at, m.original_content, m.reply_to_id,
      r.content as reply_content, r.sender_id as reply_sender_id, m.is_pinned
    FROM messages m
    LEFT JOIN messages r ON r.id = m.reply_to_id
    WHERE (m.sender_id = v_admin_id AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_admin_id)
    ORDER BY m.created_at ASC;
END;
$$;
