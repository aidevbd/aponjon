CREATE OR REPLACE FUNCTION public.create_chat_session(p_phone text, p_secret_code text, p_trusted boolean DEFAULT false, p_device_label text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_contact_id uuid; v_hash text; v_token text; v_name text; v_photo text;
  v_expires timestamptz;
  v_ip inet;
  v_ua text;
BEGIN
  IF NOT public.check_rate_limit(p_phone || ':chat', 'chat_login'::text) THEN
    RETURN json_build_object('success', false, 'error', 'RATE_LIMITED');
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  SELECT id, name, photo_url INTO v_contact_id, v_name, v_photo
  FROM contacts WHERE phone = p_phone AND secret_code_hash = v_hash;
  IF v_contact_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'INVALID');
  END IF;
  PERFORM public.reset_rate_limit(p_phone || ':chat', 'chat_login'::text);
  DELETE FROM chat_sessions WHERE expires_at < now();

  v_token := encode(extensions.digest((gen_random_uuid()::text || now()::text)::bytea, 'sha256'), 'hex');
  v_expires := CASE WHEN p_trusted THEN now() + interval '30 days' ELSE now() + interval '24 hours' END;
  v_ip := public._current_request_ip();
  v_ua := NULLIF(btrim(p_user_agent), '');

  -- Soft-dedupe: if same contact re-logs in from the same browser + IP
  -- (typical case: user cleared site data, then signed back in), retire
  -- the prior session(s) so the "active devices" list doesn't accumulate
  -- stale duplicates. Different browsers/IPs are preserved.
  IF v_ua IS NOT NULL AND v_ip IS NOT NULL THEN
    DELETE FROM chat_sessions
     WHERE contact_id = v_contact_id
       AND user_agent = v_ua
       AND ip_address = v_ip;
  END IF;

  INSERT INTO chat_sessions (contact_id, session_token, expires_at, trusted_device, device_label, last_used_at, ip_address, user_agent)
  VALUES (v_contact_id, v_token, v_expires, COALESCE(p_trusted, false), p_device_label, now(), v_ip, v_ua);

  RETURN json_build_object(
    'success', true, 'token', v_token, 'contact_id', v_contact_id,
    'name', v_name, 'photo_url', v_photo,
    'expires_at', v_expires, 'trusted', COALESCE(p_trusted, false)
  );
END;
$function$;