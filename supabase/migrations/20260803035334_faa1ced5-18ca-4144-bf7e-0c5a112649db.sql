-- 1) Does this phone have an email on file? Returns masked email only.
CREATE OR REPLACE FUNCTION public.contact_email_hint(p_phone text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text; v_local text; v_dom text;
BEGIN
  SELECT lower(btrim(email)) INTO v_email
  FROM public.contacts
  WHERE phone = p_phone AND is_admin = false AND email IS NOT NULL AND btrim(email) <> ''
  LIMIT 1;

  IF v_email IS NULL THEN
    RETURN json_build_object('has_email', false);
  END IF;

  v_local := split_part(v_email, '@', 1);
  v_dom := split_part(v_email, '@', 2);
  RETURN json_build_object(
    'has_email', true,
    'email', v_email,
    'masked', CASE WHEN length(v_local) <= 2
                   THEN repeat('*', length(v_local)) || '@' || v_dom
                   ELSE left(v_local, 2) || repeat('*', greatest(length(v_local) - 2, 1)) || '@' || v_dom END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contact_email_hint(text) FROM public;
GRANT EXECUTE ON FUNCTION public.contact_email_hint(text) TO anon, authenticated;

-- 2) After the user clicks the email link (real Supabase auth session),
--    issue a short-lived edit session for the contact owning that email.
CREATE OR REPLACE FUNCTION public.start_email_verified_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_contact public.contacts%ROWTYPE;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_SESSION');
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_EMAIL');
  END IF;

  SELECT * INTO v_contact
  FROM public.contacts
  WHERE lower(btrim(email)) = v_email AND is_admin = false
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_contact.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  DELETE FROM public.otp_edit_sessions
   WHERE phone = v_contact.phone AND (used = true OR expires_at <= now());

  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.otp_edit_sessions (phone, session_token, expires_at)
  VALUES (v_contact.phone, v_token, now() + interval '15 minutes');

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_token,
    'contact', to_jsonb(v_contact) - 'secret_code_hash' - 'auth_user_id'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_email_verified_session() FROM public;
GRANT EXECUTE ON FUNCTION public.start_email_verified_session() TO authenticated;