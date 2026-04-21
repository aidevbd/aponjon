
-- Replace blanket deny with: allow SELECT (needed for realtime), deny writes
-- Writes still must go through SECURITY DEFINER RPCs.

-- MESSAGES
DROP POLICY IF EXISTS "Deny all direct access on messages" ON public.messages;
CREATE POLICY "Realtime read messages"
  ON public.messages
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Deny direct insert on messages"
  ON public.messages FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "Deny direct update on messages"
  ON public.messages FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct delete on messages"
  ON public.messages FOR DELETE TO public USING (false);

-- CHAT_SESSIONS — fully deny (no realtime needed; tokens are sensitive)
-- (already denied; keep as is)

-- USER_PRESENCE — allow SELECT (realtime presence), deny writes
DROP POLICY IF EXISTS "Deny all direct access on user_presence" ON public.user_presence;
CREATE POLICY "Read presence"
  ON public.user_presence
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Deny direct insert on user_presence"
  ON public.user_presence FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "Deny direct update on user_presence"
  ON public.user_presence FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct delete on user_presence"
  ON public.user_presence FOR DELETE TO public USING (false);
