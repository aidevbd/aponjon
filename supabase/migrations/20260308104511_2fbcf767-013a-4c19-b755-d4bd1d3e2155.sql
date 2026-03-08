
DROP FUNCTION IF EXISTS public.verify_and_get_contact(text, text);

CREATE OR REPLACE FUNCTION public.verify_and_get_contact(p_phone text, p_secret_code text)
RETURNS TABLE(id uuid, name text, phone text, whatsapp text, imo text, email text, category text, custom_category text, note text, address text, blood_group text, birthday text, created_at timestamptz, updated_at timestamptz, rate_limited boolean, photo_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_hash TEXT;
BEGIN
  IF NOT public.check_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, TRUE, NULL::TEXT;
    RETURN;
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.whatsapp, c.imo, c.email, c.category, c.custom_category, c.note, c.address, c.blood_group, c.birthday, c.created_at, c.updated_at, FALSE, c.photo_url
    FROM contacts c
    WHERE c.phone = p_phone AND (c.secret_code_hash = v_hash OR c.secret_code = p_secret_code);
  IF FOUND THEN
    PERFORM public.reset_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text);
  END IF;
END;
$$;
