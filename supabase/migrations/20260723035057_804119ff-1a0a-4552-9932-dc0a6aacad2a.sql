
CREATE OR REPLACE FUNCTION public.set_secret_via_secret(p_phone text, p_current_secret text, p_new_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_old_hash text; v_new_hash text;
BEGIN
  IF p_new_secret IS NULL OR length(trim(p_new_secret)) < 4 THEN
    RAISE EXCEPTION 'SECRET_TOO_SHORT';
  END IF;
  v_old_hash := encode(extensions.digest(p_current_secret::bytea, 'sha256'), 'hex');
  v_new_hash := encode(extensions.digest(p_new_secret::bytea, 'sha256'), 'hex');
  UPDATE public.contacts
     SET secret_code_hash = v_new_hash, updated_at = now()
   WHERE phone = p_phone AND secret_code_hash = v_old_hash AND is_admin = false;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_secret_via_otp_session(p_session_token text, p_new_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_session public.otp_edit_sessions%ROWTYPE; v_hash text;
BEGIN
  IF p_new_secret IS NULL OR length(trim(p_new_secret)) < 4 THEN
    RAISE EXCEPTION 'SECRET_TOO_SHORT';
  END IF;
  SELECT * INTO v_session FROM public.otp_edit_sessions
   WHERE session_token = p_session_token AND used = false AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_session.id IS NULL THEN RETURN false; END IF;

  v_hash := encode(extensions.digest(p_new_secret::bytea, 'sha256'), 'hex');
  UPDATE public.contacts
     SET secret_code_hash = v_hash, updated_at = now()
   WHERE phone = v_session.phone AND is_admin = false;

  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.otp_edit_sessions SET used = true WHERE id = v_session.id;
  RETURN true;
END;
$$;
