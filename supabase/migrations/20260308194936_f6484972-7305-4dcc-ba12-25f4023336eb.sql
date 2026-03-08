
-- Add added_by column to track who added the contact
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS added_by text NOT NULL DEFAULT 'user';

-- Set all existing contacts as admin-added
UPDATE public.contacts SET added_by = 'admin' WHERE added_by = 'user';

-- Update contacts_public view to include added_by
CREATE OR REPLACE VIEW public.contacts_public AS
SELECT id, name, phone, whatsapp, imo, telegram, facebook, email, category, custom_category, note, address, blood_group, birthday, created_at, updated_at
FROM public.contacts
WHERE is_admin = false;

-- Recreate save_contact_with_hash with duplicate check logic
CREATE OR REPLACE FUNCTION public.save_contact_with_hash(
  p_name text, p_phone text,
  p_whatsapp text DEFAULT NULL, p_imo text DEFAULT NULL,
  p_email text DEFAULT NULL, p_category text DEFAULT 'অন্যান্য',
  p_custom_category text DEFAULT NULL, p_note text DEFAULT NULL,
  p_address text DEFAULT NULL, p_blood_group text DEFAULT NULL,
  p_birthday text DEFAULT NULL, p_secret_code text DEFAULT NULL,
  p_photo_url text DEFAULT NULL, p_telegram text DEFAULT NULL,
  p_facebook text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_hash TEXT; v_id UUID; v_existing_added_by TEXT;
BEGIN
  -- Check if phone already exists
  SELECT id, added_by INTO v_id, v_existing_added_by
  FROM contacts WHERE phone = p_phone AND is_admin = false LIMIT 1;
  
  IF v_id IS NOT NULL THEN
    -- If user added it before, reject
    IF v_existing_added_by = 'user' THEN
      RAISE EXCEPTION 'DUPLICATE_USER_ENTRY' USING ERRCODE = '23505';
    END IF;
    
    -- If admin added it, allow user to update/claim it
    IF p_secret_code IS NOT NULL AND p_secret_code != '' THEN
      v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
    END IF;
    
    UPDATE contacts SET
      name = p_name, whatsapp = p_whatsapp, imo = p_imo,
      telegram = p_telegram, facebook = p_facebook, email = p_email,
      category = p_category, custom_category = p_custom_category,
      note = p_note, address = p_address, blood_group = p_blood_group,
      birthday = p_birthday, secret_code_hash = COALESCE(v_hash, secret_code_hash),
      photo_url = COALESCE(p_photo_url, photo_url),
      added_by = 'user', updated_at = now()
    WHERE id = v_id;
    
    RETURN v_id;
  END IF;
  
  -- New contact
  IF p_secret_code IS NOT NULL AND p_secret_code != '' THEN
    v_hash := encode(digest(p_secret_code::bytea, 'sha256'), 'hex');
  END IF;
  
  INSERT INTO contacts (name, phone, whatsapp, imo, telegram, facebook, email, category, custom_category, note, address, blood_group, birthday, secret_code_hash, photo_url, added_by)
  VALUES (p_name, p_phone, p_whatsapp, p_imo, p_telegram, p_facebook, p_email, p_category, p_custom_category, p_note, p_address, p_blood_group, p_birthday, v_hash, p_photo_url, 'user')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;
