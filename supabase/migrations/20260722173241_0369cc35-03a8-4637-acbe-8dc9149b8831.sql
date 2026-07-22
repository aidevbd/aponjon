
CREATE OR REPLACE FUNCTION public.update_verified_contact(
  p_phone text, p_secret_code text,
  p_name text DEFAULT NULL, p_whatsapp text DEFAULT NULL, p_imo text DEFAULT NULL,
  p_email text DEFAULT NULL, p_category text DEFAULT NULL, p_custom_category text DEFAULT NULL,
  p_note text DEFAULT NULL, p_address text DEFAULT NULL, p_blood_group text DEFAULT NULL,
  p_birthday text DEFAULT NULL, p_telegram text DEFAULT NULL, p_facebook text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_hash TEXT;
BEGIN
  v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  UPDATE contacts SET
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
    photo_url = CASE WHEN p_photo_url IS NULL THEN photo_url
                     WHEN p_photo_url = '' THEN NULL
                     ELSE p_photo_url END,
    updated_at = now()
  WHERE phone = p_phone AND secret_code_hash = v_hash;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contact_via_otp_session(
  p_session_token text,
  p_name text DEFAULT NULL, p_whatsapp text DEFAULT NULL, p_imo text DEFAULT NULL,
  p_telegram text DEFAULT NULL, p_facebook text DEFAULT NULL, p_email text DEFAULT NULL,
  p_category text DEFAULT NULL, p_custom_category text DEFAULT NULL, p_note text DEFAULT NULL,
  p_address text DEFAULT NULL, p_blood_group text DEFAULT NULL, p_birthday text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_session public.otp_edit_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM public.otp_edit_sessions
   WHERE session_token = p_session_token AND used = false AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_session.id IS NULL THEN RETURN FALSE; END IF;

  UPDATE public.contacts SET
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
    photo_url = CASE WHEN p_photo_url IS NULL THEN photo_url
                     WHEN p_photo_url = '' THEN NULL
                     ELSE p_photo_url END,
    updated_at = now()
  WHERE phone = v_session.phone AND is_admin = false;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE public.otp_edit_sessions SET used = true WHERE id = v_session.id;
  RETURN TRUE;
END;
$function$;
