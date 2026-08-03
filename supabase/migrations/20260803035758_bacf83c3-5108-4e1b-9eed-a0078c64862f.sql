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
  WHERE phone = p_phone AND is_admin = false
    AND email IS NOT NULL AND btrim(email) <> ''
    AND btrim(email) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  LIMIT 1;

  IF v_email IS NULL THEN
    RETURN json_build_object('has_email', false);
  END IF;

  v_local := split_part(v_email, '@', 1);
  v_dom := split_part(v_email, '@', 2);
  RETURN json_build_object(
    'has_email', true,
    'masked', CASE WHEN length(v_local) <= 2
                   THEN repeat('*', length(v_local)) || '@' || v_dom
                   ELSE left(v_local, 2) || repeat('*', greatest(length(v_local) - 2, 1)) || '@' || v_dom END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contact_email_hint(text) FROM public;
GRANT EXECUTE ON FUNCTION public.contact_email_hint(text) TO anon, authenticated;