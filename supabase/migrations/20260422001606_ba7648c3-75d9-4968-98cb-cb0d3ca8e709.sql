
-- 1. Restrict contacts SELECT to admins only (was: any authenticated user)
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.contacts;

CREATE POLICY "Admins can view all contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.auth_user_id = auth.uid() AND c.is_admin = true
  )
);

-- 2. Trigger to prevent privilege escalation on contacts.
--    is_admin can only be flipped to true from inside a SECURITY DEFINER function
--    (which runs as table owner / postgres). Normal API calls (anon/authenticated)
--    will be blocked from setting is_admin = true on either INSERT or UPDATE.
CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_admin = true THEN
      -- Only allow when running as table owner (i.e. inside a SECURITY DEFINER fn like setup_admin_contact)
      IF current_user <> session_user THEN
        RETURN NEW; -- SECURITY DEFINER context, allow
      END IF;
      RAISE EXCEPTION 'Cannot create admin contact via direct insert';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      IF current_user <> session_user THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Cannot modify admin status via direct update';
    END IF;
    -- Also prevent reassigning auth_user_id to bind a row to a different account
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      IF current_user <> session_user THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Cannot reassign contact to a different auth user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_contacts_admin_escalation ON public.contacts;
CREATE TRIGGER prevent_contacts_admin_escalation
BEFORE INSERT OR UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_escalation();
