
-- Recreate verify_contact_by_phone with explicit schema reference
CREATE OR REPLACE FUNCTION public.verify_contact_by_phone(p_phone text)
RETURNS TABLE(id uuid, has_secret_code boolean, rate_limited boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Recreate verify_secret_code with explicit schema reference
CREATE OR REPLACE FUNCTION public.verify_secret_code(p_secret_code text)
RETURNS TABLE(id uuid, masked_phone text, rate_limited boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Recreate verify_and_get_contact with explicit schema reference
CREATE OR REPLACE FUNCTION public.verify_and_get_contact(p_phone text, p_secret_code text)
RETURNS TABLE(id uuid, name text, phone text, whatsapp text, imo text, email text, category text, custom_category text, note text, address text, blood_group text, birthday text, created_at timestamptz, updated_at timestamptz, rate_limited boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Recreate generate_otp with explicit schema reference
CREATE OR REPLACE FUNCTION public.generate_otp(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_code TEXT; v_contact_exists BOOLEAN;
BEGIN
  IF NOT public.check_rate_limit(p_phone, 'otp'::text) THEN RETURN 'RATE_LIMITED'; END IF;
  SELECT EXISTS(SELECT 1 FROM contacts WHERE phone = p_phone) INTO v_contact_exists;
  IF NOT v_contact_exists THEN RETURN 'NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM otp_codes WHERE phone = p_phone AND created_at > now() - interval '24 hours' AND NOT used) THEN
    RETURN 'DAILY_LIMIT';
  END IF;
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  UPDATE otp_codes SET used = true WHERE phone = p_phone AND NOT used;
  INSERT INTO otp_codes (phone, code) VALUES (p_phone, encode(extensions.digest(v_code::bytea, 'sha256'), 'hex'));
  RETURN v_code;
END;
$$;

-- Recreate verify_otp with explicit schema reference  
CREATE OR REPLACE FUNCTION public.verify_otp(p_phone text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_hash TEXT;
BEGIN
  v_hash := encode(extensions.digest(p_code::bytea, 'sha256'), 'hex');
  IF EXISTS(SELECT 1 FROM otp_codes WHERE phone = p_phone AND code = v_hash AND NOT used AND expires_at > now()) THEN
    UPDATE otp_codes SET used = true WHERE phone = p_phone AND code = v_hash;
    PERFORM public.reset_rate_limit(p_phone, 'otp'::text);
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;
