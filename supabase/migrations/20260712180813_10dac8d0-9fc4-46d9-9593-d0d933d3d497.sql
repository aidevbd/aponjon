DROP POLICY IF EXISTS "Read presence" ON public.user_presence;

CREATE POLICY "Admins can read all presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Chat session can read presence"
ON public.user_presence
FOR SELECT
TO anon, authenticated
USING (contact_id = public.current_chat_session_contact());