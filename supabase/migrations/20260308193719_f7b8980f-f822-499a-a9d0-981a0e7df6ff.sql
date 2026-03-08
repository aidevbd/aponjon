
-- Add facebook column
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS facebook text;

-- Drop and recreate the view with telegram + facebook
DROP VIEW IF EXISTS public.contacts_public;
CREATE VIEW public.contacts_public AS
SELECT id, name, phone, whatsapp, imo, telegram, facebook, email, category, custom_category, note, address, blood_group, birthday, created_at, updated_at
FROM contacts
WHERE is_admin = false;

-- Drop ALL overloads of save_contact_with_hash to start fresh
DROP FUNCTION IF EXISTS public.save_contact_with_hash(text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.save_contact_with_hash(text, text, text, text, text, text, text, text, text, text, text, text, text, text);

-- Create the single definitive version
CREATE FUNCTION public.save_contact_with_hash(
  p_name text, p_phone text, p_whatsapp text DEFAULT NULL, p_imo text DEFAULT NULL,
  p_email text DEFAULT NULL, p_category text DEFAULT 'অন্যান্য', p_custom_category text DEFAULT NULL,
  p_note text DEFAULT NULL, p_address text DEFAULT NULL, p_blood_group text DEFAULT NULL,
  p_birthday text DEFAULT NULL, p_secret_code text DEFAULT NULL, p_photo_url text DEFAULT NULL,
  p_telegram text DEFAULT NULL, p_facebook text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE v_hash TEXT; v_id UUID;
BEGIN
  IF p_secret_code IS NOT NULL AND p_secret_code != '' THEN
    v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  END IF;
  INSERT INTO contacts (name, phone, whatsapp, imo, telegram, facebook, email, category, custom_category, note, address, blood_group, birthday, secret_code_hash, photo_url)
  VALUES (p_name, p_phone, p_whatsapp, p_imo, p_telegram, p_facebook, p_email, p_category, p_custom_category, p_note, p_address, p_blood_group, p_birthday, v_hash, p_photo_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Update update_verified_contact with telegram + facebook
DROP FUNCTION IF EXISTS public.update_verified_contact(text, text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_verified_contact(
  p_phone text, p_secret_code text, p_name text DEFAULT NULL, p_whatsapp text DEFAULT NULL,
  p_imo text DEFAULT NULL, p_email text DEFAULT NULL, p_category text DEFAULT NULL,
  p_custom_category text DEFAULT NULL, p_note text DEFAULT NULL, p_address text DEFAULT NULL,
  p_blood_group text DEFAULT NULL, p_birthday text DEFAULT NULL, p_telegram text DEFAULT NULL,
  p_facebook text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE v_hash TEXT;
BEGIN
  v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  UPDATE contacts SET
    name = COALESCE(p_name, name), whatsapp = COALESCE(p_whatsapp, whatsapp),
    imo = COALESCE(p_imo, imo), telegram = COALESCE(p_telegram, telegram),
    facebook = COALESCE(p_facebook, facebook),
    email = COALESCE(p_email, email), category = COALESCE(p_category, category),
    custom_category = COALESCE(p_custom_category, custom_category),
    note = COALESCE(p_note, note), address = COALESCE(p_address, address),
    blood_group = COALESCE(p_blood_group, blood_group), birthday = COALESCE(p_birthday, birthday),
    updated_at = now()
  WHERE phone = p_phone AND (secret_code_hash = v_hash OR secret_code = p_secret_code);
  RETURN FOUND;
END;
$$;

-- Update verify_and_get_contact with facebook
DROP FUNCTION IF EXISTS public.verify_and_get_contact(text, text);

CREATE FUNCTION public.verify_and_get_contact(p_phone text, p_secret_code text)
RETURNS TABLE(id uuid, name text, phone text, whatsapp text, imo text, email text, category text, custom_category text, note text, address text, blood_group text, birthday text, created_at timestamptz, updated_at timestamptz, rate_limited boolean, photo_url text, telegram text, facebook text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_hash TEXT;
BEGIN
  IF NOT public.check_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, TRUE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, c.name, c.phone, c.whatsapp, c.imo, c.email, c.category, c.custom_category, c.note, c.address, c.blood_group, c.birthday, c.created_at, c.updated_at, FALSE, c.photo_url, c.telegram, c.facebook
    FROM contacts c
    WHERE c.phone = p_phone AND (c.secret_code_hash = v_hash OR c.secret_code = p_secret_code);
  IF FOUND THEN
    PERFORM public.reset_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text);
  END IF;
END;
$$;
