-- Update save_contact_with_hash to include photo_url
CREATE OR REPLACE FUNCTION public.save_contact_with_hash(
  p_name text, p_phone text, p_whatsapp text DEFAULT NULL, p_imo text DEFAULT NULL,
  p_email text DEFAULT NULL, p_category text DEFAULT 'অন্যান্য', p_custom_category text DEFAULT NULL,
  p_note text DEFAULT NULL, p_address text DEFAULT NULL, p_blood_group text DEFAULT NULL,
  p_birthday text DEFAULT NULL, p_secret_code text DEFAULT NULL, p_photo_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_hash TEXT; v_id UUID;
BEGIN
  IF p_secret_code IS NOT NULL AND p_secret_code != '' THEN
    v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  END IF;
  INSERT INTO contacts (name, phone, whatsapp, imo, email, category, custom_category, note, address, blood_group, birthday, secret_code_hash, photo_url)
  VALUES (p_name, p_phone, p_whatsapp, p_imo, p_email, p_category, p_custom_category, p_note, p_address, p_blood_group, p_birthday, v_hash, p_photo_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
