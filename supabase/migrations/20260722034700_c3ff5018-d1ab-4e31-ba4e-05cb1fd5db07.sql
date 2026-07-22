CREATE OR REPLACE FUNCTION public.trust_current_chat_session(p_token text, p_device_label text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row chat_sessions%ROWTYPE;
  v_new_expires timestamptz;
  v_label text;
BEGIN
  SELECT * INTO v_row FROM chat_sessions
   WHERE session_token = p_token AND expires_at > now()
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false);
  END IF;
  v_new_expires := now() + interval '30 days';
  v_label := NULLIF(btrim(p_device_label), '');
  UPDATE chat_sessions
     SET trusted_device = true,
         expires_at = v_new_expires,
         last_used_at = now(),
         device_label = COALESCE(v_label, device_label)
   WHERE id = v_row.id;
  RETURN json_build_object('valid', true, 'expires_at', v_new_expires, 'trusted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.trust_current_chat_session(text, text) TO anon, authenticated;