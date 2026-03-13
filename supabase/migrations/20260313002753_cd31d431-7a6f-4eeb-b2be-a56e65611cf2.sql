-- Add explicit deny-all policies for newly secured tables (silences no-policy lints while keeping data private)
DROP POLICY IF EXISTS "Deny all direct access" ON public.rate_limit_attempts;
CREATE POLICY "Deny all direct access"
ON public.rate_limit_attempts
FOR ALL
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all direct access" ON public.otp_edit_sessions;
CREATE POLICY "Deny all direct access"
ON public.otp_edit_sessions
FOR ALL
TO public
USING (false)
WITH CHECK (false);