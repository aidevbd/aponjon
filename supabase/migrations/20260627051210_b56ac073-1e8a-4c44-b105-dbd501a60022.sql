
-- 1. Update functions to stop referencing plaintext secret_code (only use hash)
CREATE OR REPLACE FUNCTION public.verify_contact_by_phone(p_phone text)
 RETURNS TABLE(id uuid, has_secret_code boolean, rate_limited boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.check_rate_limit(p_phone, 'verify_phone'::text) THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, TRUE; RETURN;
  END IF;
  RETURN QUERY
    SELECT c.id, (c.secret_code_hash IS NOT NULL) AS has_secret_code, FALSE
    FROM contacts c WHERE c.phone = p_phone LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_secret_code(p_secret_code text)
 RETURNS TABLE(id uuid, masked_phone text, rate_limited boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_hash TEXT;
BEGIN
  IF NOT public.check_rate_limit(p_secret_code, 'verify_secret'::text) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, TRUE; RETURN;
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  RETURN QUERY
    SELECT c.id, LEFT(c.phone, 3) || '****' || RIGHT(c.phone, 2), FALSE
    FROM contacts c WHERE c.secret_code_hash = v_hash;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_and_get_contact(p_phone text, p_secret_code text)
 RETURNS TABLE(id uuid, name text, phone text, whatsapp text, imo text, email text, category text, custom_category text, note text, address text, blood_group text, birthday text, created_at timestamp with time zone, updated_at timestamp with time zone, rate_limited boolean, photo_url text, telegram text, facebook text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
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
    WHERE c.phone = p_phone AND c.secret_code_hash = v_hash;
  IF FOUND THEN
    PERFORM public.reset_rate_limit(p_phone || ':' || p_secret_code, 'verify_full'::text);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_verified_contact(p_phone text, p_secret_code text, p_name text DEFAULT NULL, p_whatsapp text DEFAULT NULL, p_imo text DEFAULT NULL, p_email text DEFAULT NULL, p_category text DEFAULT NULL, p_custom_category text DEFAULT NULL, p_note text DEFAULT NULL, p_address text DEFAULT NULL, p_blood_group text DEFAULT NULL, p_birthday text DEFAULT NULL, p_telegram text DEFAULT NULL, p_facebook text DEFAULT NULL)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
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
  WHERE phone = p_phone AND secret_code_hash = v_hash;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_chat_session(p_phone text, p_secret_code text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_contact_id uuid; v_hash text; v_token text; v_name text; v_photo text;
BEGIN
  IF NOT public.check_rate_limit(p_phone || ':chat', 'chat_login'::text) THEN
    RETURN json_build_object('success', false, 'error', 'RATE_LIMITED');
  END IF;
  v_hash := encode(extensions.digest(p_secret_code::bytea, 'sha256'), 'hex');
  SELECT id, name, photo_url INTO v_contact_id, v_name, v_photo
  FROM contacts WHERE phone = p_phone AND secret_code_hash = v_hash;
  IF v_contact_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'INVALID');
  END IF;
  PERFORM public.reset_rate_limit(p_phone || ':chat', 'chat_login'::text);
  DELETE FROM chat_sessions WHERE expires_at < now();
  v_token := encode(extensions.digest((gen_random_uuid()::text || now()::text)::bytea, 'sha256'), 'hex');
  DELETE FROM chat_sessions WHERE contact_id = v_contact_id;
  INSERT INTO chat_sessions (contact_id, session_token) VALUES (v_contact_id, v_token);
  RETURN json_build_object('success', true, 'token', v_token, 'contact_id', v_contact_id, 'name', v_name, 'photo_url', v_photo);
END;
$function$;

-- 2. Drop the plaintext secret_code column entirely
ALTER TABLE public.contacts DROP COLUMN IF EXISTS secret_code;

-- 3. Tighten contacts INSERT policy: force everyone through save_contact_with_hash RPC.
DROP POLICY IF EXISTS "Anyone can add non-admin contacts" ON public.contacts;
CREATE POLICY "Deny direct insert on contacts"
  ON public.contacts FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- 4. Add explicit deny SELECT on messages for non-admins (chat users use get_messages RPC).
CREATE POLICY "Deny direct select on messages for non-admins"
  ON public.messages FOR SELECT TO anon
  USING (false);
