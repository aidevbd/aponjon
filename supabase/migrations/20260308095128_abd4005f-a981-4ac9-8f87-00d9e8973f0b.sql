
-- Drop overly permissive anon policies
DROP POLICY IF EXISTS "Anon can select own contact by phone" ON public.contacts;
DROP POLICY IF EXISTS "Anon can update contacts" ON public.contacts;

-- Create a security definer function for phone verification (no direct anon SELECT)
CREATE OR REPLACE FUNCTION public.verify_contact_by_phone(p_phone TEXT)
RETURNS TABLE(id UUID, has_secret_code BOOLEAN) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, (secret_code IS NOT NULL AND secret_code != '') as has_secret_code
  FROM public.contacts
  WHERE phone = p_phone
  LIMIT 1;
$$;

-- Function to verify secret code and return masked phones
CREATE OR REPLACE FUNCTION public.verify_secret_code(p_secret_code TEXT)
RETURNS TABLE(id UUID, masked_phone TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, 
    LEFT(phone, 3) || '****' || RIGHT(phone, 2) as masked_phone
  FROM public.contacts
  WHERE secret_code = p_secret_code;
$$;

-- Function to fully verify and return contact for editing
CREATE OR REPLACE FUNCTION public.verify_and_get_contact(p_phone TEXT, p_secret_code TEXT)
RETURNS SETOF public.contacts_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, phone, whatsapp, imo, email, category, custom_category, note, address, blood_group, birthday, created_at, updated_at
  FROM public.contacts
  WHERE phone = p_phone AND secret_code = p_secret_code;
$$;

-- Function to update contact after verification
CREATE OR REPLACE FUNCTION public.update_verified_contact(
  p_phone TEXT,
  p_secret_code TEXT,
  p_name TEXT DEFAULT NULL,
  p_whatsapp TEXT DEFAULT NULL,
  p_imo TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_custom_category TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_blood_group TEXT DEFAULT NULL,
  p_birthday TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contacts
  SET
    name = COALESCE(p_name, name),
    whatsapp = COALESCE(p_whatsapp, whatsapp),
    imo = COALESCE(p_imo, imo),
    email = COALESCE(p_email, email),
    category = COALESCE(p_category, category),
    custom_category = COALESCE(p_custom_category, custom_category),
    note = COALESCE(p_note, note),
    address = COALESCE(p_address, address),
    blood_group = COALESCE(p_blood_group, blood_group),
    birthday = COALESCE(p_birthday, birthday),
    updated_at = now()
  WHERE phone = p_phone AND secret_code = p_secret_code;
  
  RETURN FOUND;
END;
$$;
