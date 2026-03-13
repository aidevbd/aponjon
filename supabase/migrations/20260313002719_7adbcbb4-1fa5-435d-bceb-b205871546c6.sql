-- 1) Stop exposing raw OTP values to clients
CREATE OR REPLACE FUNCTION public.generate_otp(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_contact_exists BOOLEAN;
BEGIN
  IF NOT public.check_rate_limit(p_phone, 'otp'::text) THEN
    RETURN 'RATE_LIMITED';
  END IF;

  SELECT EXISTS(SELECT 1 FROM contacts WHERE phone = p_phone) INTO v_contact_exists;
  IF NOT v_contact_exists THEN
    RETURN 'NOT_FOUND';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM otp_codes
    WHERE phone = p_phone
      AND created_at > now() - interval '24 hours'
      AND NOT used
  ) THEN
    RETURN 'DAILY_LIMIT';
  END IF;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  UPDATE otp_codes
  SET used = true
  WHERE phone = p_phone
    AND NOT used;

  INSERT INTO otp_codes (phone, code)
  VALUES (p_phone, encode(extensions.digest(v_code::bytea, 'sha256'), 'hex'));

  -- OTP value is intentionally never returned to the client.
  -- Integrate SMS delivery out-of-band; client only receives status.
  RETURN 'SENT';
END;
$function$;

-- 2) One-time OTP edit sessions for secure contact updates
CREATE TABLE IF NOT EXISTS public.otp_edit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_edit_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.start_otp_edit_session(p_phone text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hash text;
  v_otp_id uuid;
  v_token text;
  v_contact public.contacts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_contact
  FROM public.contacts
  WHERE phone = p_phone
    AND is_admin = false
  LIMIT 1;

  IF v_contact.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  v_hash := encode(extensions.digest(p_code::bytea, 'sha256'), 'hex');

  SELECT id
  INTO v_otp_id
  FROM public.otp_codes
  WHERE phone = p_phone
    AND code = v_hash
    AND used = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_otp_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OTP');
  END IF;

  UPDATE public.otp_codes
  SET used = true
  WHERE id = v_otp_id;

  PERFORM public.reset_rate_limit(p_phone, 'otp'::text);

  DELETE FROM public.otp_edit_sessions
  WHERE phone = p_phone
    AND (used = true OR expires_at <= now());

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.otp_edit_sessions (phone, session_token, expires_at)
  VALUES (p_phone, v_token, now() + interval '15 minutes');

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_token,
    'contact', jsonb_build_object(
      'id', v_contact.id,
      'name', v_contact.name,
      'phone', v_contact.phone,
      'whatsapp', v_contact.whatsapp,
      'imo', v_contact.imo,
      'telegram', v_contact.telegram,
      'facebook', v_contact.facebook,
      'email', v_contact.email,
      'category', v_contact.category,
      'custom_category', v_contact.custom_category,
      'note', v_contact.note,
      'address', v_contact.address,
      'blood_group', v_contact.blood_group,
      'birthday', v_contact.birthday,
      'photo_url', v_contact.photo_url,
      'created_at', v_contact.created_at,
      'updated_at', v_contact.updated_at
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contact_via_otp_session(
  p_session_token text,
  p_name text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_imo text DEFAULT NULL,
  p_telegram text DEFAULT NULL,
  p_facebook text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_custom_category text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_blood_group text DEFAULT NULL,
  p_birthday text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.otp_edit_sessions%ROWTYPE;
BEGIN
  SELECT *
  INTO v_session
  FROM public.otp_edit_sessions
  WHERE session_token = p_session_token
    AND used = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.contacts
  SET
    name = COALESCE(p_name, name),
    whatsapp = COALESCE(p_whatsapp, whatsapp),
    imo = COALESCE(p_imo, imo),
    telegram = COALESCE(p_telegram, telegram),
    facebook = COALESCE(p_facebook, facebook),
    email = COALESCE(p_email, email),
    category = COALESCE(p_category, category),
    custom_category = COALESCE(p_custom_category, custom_category),
    note = COALESCE(p_note, note),
    address = COALESCE(p_address, address),
    blood_group = COALESCE(p_blood_group, blood_group),
    birthday = COALESCE(p_birthday, birthday),
    photo_url = COALESCE(p_photo_url, photo_url),
    updated_at = now()
  WHERE phone = v_session.phone
    AND is_admin = false;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.otp_edit_sessions
  SET used = true
  WHERE id = v_session.id;

  RETURN TRUE;
END;
$function$;

-- 3) Lock down rate_limit_attempts from direct public access
DROP POLICY IF EXISTS "Allow all operations on rate_limit_attempts" ON public.rate_limit_attempts;
REVOKE ALL ON TABLE public.rate_limit_attempts FROM anon, authenticated;

-- 4) Ensure old unsafe contact policy cannot exist
DROP POLICY IF EXISTS "Anon can update contacts" ON public.contacts;

-- 5) Make contacts_public execute with caller permissions (not definer)
ALTER VIEW public.contacts_public SET (security_invoker = true);