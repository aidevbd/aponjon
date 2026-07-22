
-- 1) Schema changes
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trusted_device boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_label text;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_contact ON public.chat_sessions(contact_id);

-- 2) Updated create_chat_session with trust + device label
CREATE OR REPLACE FUNCTION public.create_chat_session(
  p_phone text,
  p_secret_code text,
  p_trusted boolean DEFAULT false,
  p_device_label text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_contact_id uuid; v_hash text; v_token text; v_name text; v_photo text;
  v_expires timestamptz;
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

  -- NOTE: no longer deletes other sessions for this contact — multi-device supported
  INSERT INTO chat_sessions (contact_id, session_token, expires_at, trusted_device, device_label, last_used_at)
  VALUES (v_contact_id, v_token, v_expires, COALESCE(p_trusted, false), p_device_label, now());

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'contact_id', v_contact_id,
    'name', v_name,
    'photo_url', v_photo,
    'expires_at', v_expires,
    'trusted', COALESCE(p_trusted, false)
  );
END;
$function$;

-- 3) touch_chat_session — sliding refresh
CREATE OR REPLACE FUNCTION public.touch_chat_session(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.chat_sessions%ROWTYPE;
  v_new_expires timestamptz;
BEGIN
  SELECT * INTO v_row FROM public.chat_sessions
    WHERE session_token = p_token AND expires_at > now();
  IF v_row.id IS NULL THEN
    RETURN json_build_object('valid', false);
  END IF;

  IF v_row.trusted_device THEN
    v_new_expires := now() + interval '30 days';
  ELSE
    -- non-trusted: keep original expiry; just refresh last_used_at
    v_new_expires := v_row.expires_at;
  END IF;

  UPDATE public.chat_sessions
     SET last_used_at = now(), expires_at = v_new_expires
   WHERE id = v_row.id;

  RETURN json_build_object('valid', true, 'expires_at', v_new_expires, 'trusted', v_row.trusted_device);
END;
$function$;

-- 4) list_my_chat_sessions
CREATE OR REPLACE FUNCTION public.list_my_chat_sessions(p_token text)
RETURNS TABLE(
  id uuid,
  device_label text,
  trusted_device boolean,
  is_current boolean,
  created_at timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_contact uuid; v_current uuid;
BEGIN
  SELECT contact_id, id INTO v_contact, v_current
  FROM public.chat_sessions
  WHERE session_token = p_token AND expires_at > now();
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

-- 5) revoke a specific session by id
CREATE OR REPLACE FUNCTION public.revoke_chat_session(p_token text, p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_contact uuid;
BEGIN
  SELECT contact_id INTO v_contact FROM public.chat_sessions
    WHERE session_token = p_token AND expires_at > now();
  IF v_contact IS NULL THEN RETURN false; END IF;
  DELETE FROM public.chat_sessions WHERE id = p_session_id AND contact_id = v_contact;
  RETURN FOUND;
END;
$function$;

-- 6) revoke all others
CREATE OR REPLACE FUNCTION public.revoke_all_other_chat_sessions(p_token text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_contact uuid; v_current uuid; v_count integer;
BEGIN
  SELECT contact_id, id INTO v_contact, v_current FROM public.chat_sessions
    WHERE session_token = p_token AND expires_at > now();
  IF v_contact IS NULL THEN RETURN 0; END IF;
  WITH d AS (
    DELETE FROM public.chat_sessions
     WHERE contact_id = v_contact AND id <> v_current
     RETURNING 1
  ) SELECT count(*) INTO v_count FROM d;
  RETURN v_count;
END;
$function$;

-- 7) revoke ALL (including current)
CREATE OR REPLACE FUNCTION public.revoke_all_chat_sessions(p_token text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_contact uuid; v_count integer;
BEGIN
  SELECT contact_id INTO v_contact FROM public.chat_sessions
    WHERE session_token = p_token AND expires_at > now();
  IF v_contact IS NULL THEN RETURN 0; END IF;
  WITH d AS (
    DELETE FROM public.chat_sessions WHERE contact_id = v_contact RETURNING 1
  ) SELECT count(*) INTO v_count FROM d;
  RETURN v_count;
END;
$function$;
