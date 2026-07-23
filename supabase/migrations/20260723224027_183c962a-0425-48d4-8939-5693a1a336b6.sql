
-- 1) Extend chat_sessions with device identification columns
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Helper: read the true client IP from PostgREST-forwarded headers, falling back to inet_client_addr()
CREATE OR REPLACE FUNCTION public._current_request_ip()
RETURNS inet
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers json;
  v_xff text;
  v_first text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;
  IF v_headers IS NOT NULL THEN
    v_xff := v_headers->>'x-forwarded-for';
    IF v_xff IS NOT NULL AND length(v_xff) > 0 THEN
      v_first := btrim(split_part(v_xff, ',', 1));
      BEGIN
        RETURN v_first::inet;
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
    END IF;
  END IF;
  RETURN inet_client_addr();
END;
$$;

-- 2) Update create_chat_session to accept user agent + capture IP
CREATE OR REPLACE FUNCTION public.create_chat_session(
  p_phone text,
  p_secret_code text,
  p_trusted boolean DEFAULT false,
  p_device_label text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
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

  INSERT INTO chat_sessions (contact_id, session_token, expires_at, trusted_device, device_label, last_used_at, ip_address, user_agent)
  VALUES (v_contact_id, v_token, v_expires, COALESCE(p_trusted, false), p_device_label, now(), v_ip, v_ua);

  RETURN json_build_object(
    'success', true, 'token', v_token, 'contact_id', v_contact_id,
    'name', v_name, 'photo_url', v_photo,
    'expires_at', v_expires, 'trusted', COALESCE(p_trusted, false)
  );
END;
$$;

-- 3) touch_chat_session: refresh IP on every keep-alive so mobile network changes show up
CREATE OR REPLACE FUNCTION public.touch_chat_session(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.chat_sessions%ROWTYPE;
  v_new_expires timestamptz;
  v_ip inet;
BEGIN
  SELECT * INTO v_row FROM public.chat_sessions
    WHERE session_token = p_token AND expires_at > now();
  IF v_row.id IS NULL THEN
    RETURN json_build_object('valid', false);
  END IF;

  IF v_row.trusted_device THEN
    v_new_expires := now() + interval '30 days';
  ELSE
    v_new_expires := v_row.expires_at;
  END IF;

  v_ip := public._current_request_ip();

  UPDATE public.chat_sessions
     SET last_used_at = now(),
         expires_at = v_new_expires,
         ip_address = COALESCE(v_ip, ip_address)
   WHERE id = v_row.id;

  RETURN json_build_object('valid', true, 'expires_at', v_new_expires, 'trusted', v_row.trusted_device);
END;
$$;

-- 4) list_my_chat_sessions: expose ip_address + user_agent
DROP FUNCTION IF EXISTS public.list_my_chat_sessions(text);
CREATE OR REPLACE FUNCTION public.list_my_chat_sessions(p_token text)
RETURNS TABLE(
  id uuid,
  device_label text,
  trusted_device boolean,
  is_current boolean,
  created_at timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz,
  ip_address text,
  user_agent text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_contact uuid; v_current uuid;
BEGIN
  SELECT cs.contact_id, cs.id INTO v_contact, v_current
  FROM public.chat_sessions cs
  WHERE cs.session_token = p_token AND cs.expires_at > now();
  IF v_contact IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT s.id, s.device_label, s.trusted_device,
           (s.id = v_current) AS is_current,
           s.created_at, s.last_used_at, s.expires_at,
           host(s.ip_address) AS ip_address,
           s.user_agent
      FROM public.chat_sessions s
     WHERE s.contact_id = v_contact AND s.expires_at > now()
     ORDER BY (s.id = v_current) DESC, s.last_used_at DESC;
END;
$$;
