CREATE OR REPLACE FUNCTION public.list_my_chat_sessions(p_token text)
 RETURNS TABLE(id uuid, device_label text, trusted_device boolean, is_current boolean, created_at timestamp with time zone, last_used_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_contact uuid; v_current uuid;
BEGIN
  SELECT cs.contact_id, cs.id INTO v_contact, v_current
  FROM public.chat_sessions cs
  WHERE cs.session_token = p_token AND cs.expires_at > now();
  IF v_contact IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT s.id, s.device_label, s.trusted_device,
           (s.id = v_current) AS is_current,
           s.created_at, s.last_used_at, s.expires_at
      FROM public.chat_sessions s
     WHERE s.contact_id = v_contact AND s.expires_at > now()
     ORDER BY (s.id = v_current) DESC, s.last_used_at DESC;
END;
$function$;