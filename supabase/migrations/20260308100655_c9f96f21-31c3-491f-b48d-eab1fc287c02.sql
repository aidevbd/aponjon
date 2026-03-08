
-- Drop old functions with old signatures
DROP FUNCTION IF EXISTS public.verify_contact_by_phone(TEXT);
DROP FUNCTION IF EXISTS public.verify_secret_code(TEXT);
DROP FUNCTION IF EXISTS public.verify_and_get_contact(TEXT, TEXT);

-- Verify contact by phone with rate limiting
CREATE OR REPLACE FUNCTION public.verify_contact_by_phone(p_phone TEXT)
RETURNS TABLE(id UUID, has_secret_code BOOLEAN, rate_limited BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT check_rate_limit(p_phone, 'verify_phone') THEN
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

-- Verify secret code with rate limiting and hash
CREATE OR REPLACE FUNCTION public.verify_secret_code(p_secret_code TEXT)
RETURNS TABLE(id UUID, masked_phone TEXT, rate_limited BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash TEXT;
BEGIN
  IF NOT check_rate_limit(p_secret_code, 'verify_secret') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, TRUE;
    RETURN;
  END IF;
  v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, LEFT(c.phone, 3) || '****' || RIGHT(c.phone, 2), FALSE
    FROM contacts c
    WHERE c.secret_code_hash = v_hash OR c.secret_code = p_secret_code;
END;
$$;

-- Verify and get contact with hash
CREATE OR REPLACE FUNCTION public.verify_and_get_contact(p_phone TEXT, p_secret_code TEXT)
RETURNS TABLE(id UUID, name TEXT, phone TEXT, whatsapp TEXT, imo TEXT, email TEXT, category TEXT, custom_category TEXT, note TEXT, address TEXT, blood_group TEXT, birthday TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, rate_limited BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash TEXT;
BEGIN
  IF NOT check_rate_limit(p_phone || ':' || p_secret_code, 'verify_full') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, TRUE;
    RETURN;
  END IF;
  v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.whatsapp, c.imo, c.email, c.category, c.custom_category, c.note, c.address, c.blood_group, c.birthday, c.created_at, c.updated_at, FALSE
    FROM contacts c
    WHERE c.phone = p_phone AND (c.secret_code_hash = v_hash OR c.secret_code = p_secret_code);
  IF FOUND THEN
    PERFORM reset_rate_limit(p_phone || ':' || p_secret_code, 'verify_full');
  END IF;
END;
$$;

-- Update verified contact with hash
CREATE OR REPLACE FUNCTION public.update_verified_contact(
  p_phone TEXT, p_secret_code TEXT,
  p_name TEXT DEFAULT NULL, p_whatsapp TEXT DEFAULT NULL, p_imo TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL, p_category TEXT DEFAULT NULL, p_custom_category TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL, p_address TEXT DEFAULT NULL, p_blood_group TEXT DEFAULT NULL,
  p_birthday TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash TEXT;
BEGIN
  v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  UPDATE contacts SET
    name = COALESCE(p_name, name), whatsapp = COALESCE(p_whatsapp, whatsapp),
    imo = COALESCE(p_imo, imo), email = COALESCE(p_email, email),
    category = COALESCE(p_category, category), custom_category = COALESCE(p_custom_category, custom_category),
    note = COALESCE(p_note, note), address = COALESCE(p_address, address),
    blood_group = COALESCE(p_blood_group, blood_group), birthday = COALESCE(p_birthday, birthday),
    updated_at = now()
  WHERE phone = p_phone AND (secret_code_hash = v_hash OR secret_code = p_secret_code);
  RETURN FOUND;
END;
$$;

-- Save contact with hashed secret code
CREATE OR REPLACE FUNCTION public.save_contact_with_hash(
  p_name TEXT, p_phone TEXT, p_whatsapp TEXT DEFAULT NULL, p_imo TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL, p_category TEXT DEFAULT 'অন্যান্য', p_custom_category TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL, p_address TEXT DEFAULT NULL, p_blood_group TEXT DEFAULT NULL,
  p_birthday TEXT DEFAULT NULL, p_secret_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash TEXT; v_id UUID;
BEGIN
  IF p_secret_code IS NOT NULL AND p_secret_code != '' THEN
    v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  END IF;
  INSERT INTO contacts (name, phone, whatsapp, imo, email, category, custom_category, note, address, blood_group, birthday, secret_code_hash)
  VALUES (p_name, p_phone, p_whatsapp, p_imo, p_email, p_category, p_custom_category, p_note, p_address, p_blood_group, p_birthday, v_hash)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Generate OTP
CREATE OR REPLACE FUNCTION public.generate_otp(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_code TEXT; v_contact_exists BOOLEAN;
BEGIN
  IF NOT check_rate_limit(p_phone, 'otp') THEN RETURN 'RATE_LIMITED'; END IF;
  SELECT EXISTS(SELECT 1 FROM contacts WHERE phone = p_phone) INTO v_contact_exists;
  IF NOT v_contact_exists THEN RETURN 'NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM otp_codes WHERE phone = p_phone AND created_at > now() - interval '24 hours' AND NOT used) THEN
    RETURN 'DAILY_LIMIT';
  END IF;
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  UPDATE otp_codes SET used = true WHERE phone = p_phone AND NOT used;
  INSERT INTO otp_codes (phone, code) VALUES (p_phone, encode(digest(v_code::bytea, 'sha256'), 'hex'));
  RETURN v_code;
END;
$$;

-- Verify OTP
CREATE OR REPLACE FUNCTION public.verify_otp(p_phone TEXT, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash TEXT;
BEGIN
  v_hash := encode(digest(p_code::bytea, 'sha256'), 'hex');
  IF EXISTS(SELECT 1 FROM otp_codes WHERE phone = p_phone AND code = v_hash AND NOT used AND expires_at > now()) THEN
    UPDATE otp_codes SET used = true WHERE phone = p_phone AND code = v_hash;
    PERFORM reset_rate_limit(p_phone, 'otp');
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;
