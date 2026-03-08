
DROP VIEW IF EXISTS public.contacts_public;
CREATE VIEW public.contacts_public WITH (security_invoker=on) AS
SELECT id, name, phone, whatsapp, imo, telegram, facebook, email, category, custom_category, note, address, blood_group, birthday, created_at, updated_at
FROM contacts
WHERE is_admin = false;
