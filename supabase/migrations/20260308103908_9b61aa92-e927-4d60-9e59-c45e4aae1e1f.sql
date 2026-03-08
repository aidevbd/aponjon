
-- Fix verify_contact_by_phone: STABLE -> VOLATILE (because check_rate_limit does writes)
CREATE OR REPLACE FUNCTION public.verify_contact_by_phone(p_phone text)
RETURNS TABLE(id uuid, has_secret_code boolean, rate_limited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_rate_limit(p_phone, 'verify_phone'::text) THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, TRUE;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT c.id, 
      (c.secret_code_hash IS NOT NULL OR (c.secret_code IS NOT NULL AND c.secret_code != '')) as has_secret_code,
      FALSE as rate_limited
    FROM contacts c WHERE c.phone = p_phone LIMIT 1;
END;
$$;

-- Fix verify_secret_code: STABLE -> VOLATILE
CREATE OR REPLACE FUNCTION public.verify_secret_code(p_secret_code text)
RETURNS TABLE(id uuid, masked_phone text, rate_limited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_hash TEXT;
BEGIN
  IF NOT public.check_rate_limit(p_secret_code, 'verify_secret'::text) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, TRUE;
    RETURN;
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, LEFT(c.phone, 3) || '****' || RIGHT(c.phone, 2), FALSE
    FROM contacts c
    WHERE c.secret_code_hash = v_hash OR c.secret_code = p_secret_code;
END;
$$;

-- Fix verify_and_get_contact: STABLE -> VOLATILE
CREATE OR REPLACE FUNCTION public.verify_and_get_contact(p_phone text, p_secret_code text)
RETURNS TABLE(id uuid, name text, phone text, whatsapp text, imo text, email text, category text, custom_category text, note text, address text, blood_group text, birthday text, created_at timestamptz, updated_at timestamptz, rate_limited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_hash TEXT;
BEGIN
  IF NOT public.check_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, TRUE;
    RETURN;
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.whatsapp, c.imo, c.email, c.category, c.custom_category, c.note, c.address, c.blood_group, c.birthday, c.created_at, c.updated_at, FALSE
    FROM contacts c
    WHERE c.phone = p_phone AND (c.secret_code_hash = v_hash OR c.secret_code = p_secret_code);
  IF FOUND THEN
    PERFORM public.reset_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text);
  END IF;
END;
$$;
