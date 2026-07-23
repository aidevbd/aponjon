CREATE OR REPLACE FUNCTION public.get_admin_chat_users()
 RETURNS TABLE(id uuid, name text, phone text, photo_url text, last_message_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.photo_url,
      (SELECT MAX(m.created_at) FROM messages m
       WHERE (m.sender_id = c.id AND m.receiver_id = v_admin_id)
          OR (m.sender_id = v_admin_id AND m.receiver_id = c.id)) AS last_message_at
    FROM contacts c
    WHERE c.is_admin = false
      AND c.id <> v_admin_id
      AND (
        c.id IN (
          SELECT m.sender_id FROM messages m WHERE m.receiver_id = v_admin_id
          UNION
          SELECT m.receiver_id FROM messages m WHERE m.sender_id = v_admin_id
        )
        OR c.id IN (
          SELECT p.contact_id FROM user_presence p
          WHERE p.is_online = true
            AND p.last_seen_at > now() - interval '2 minutes'
        )
      )
    ORDER BY last_message_at DESC NULLS LAST, c.name ASC;
END;
$function$;