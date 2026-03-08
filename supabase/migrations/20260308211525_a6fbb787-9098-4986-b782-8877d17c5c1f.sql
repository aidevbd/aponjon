
-- Drop and recreate get_admin_messages with new return type
DROP FUNCTION IF EXISTS public.get_admin_messages(uuid);

CREATE OR REPLACE FUNCTION public.get_admin_messages(p_other_id uuid)
RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamp with time zone, deleted_by_sender boolean)
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
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at, m.deleted_by_sender
    FROM messages m
    WHERE (m.sender_id = v_admin_id AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_admin_id)
    ORDER BY m.created_at ASC;
END;
$$;
