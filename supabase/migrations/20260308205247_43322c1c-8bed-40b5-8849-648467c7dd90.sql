
-- Create user_presence table to track last seen
CREATE TABLE public.user_presence (
  contact_id uuid PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Allow all operations (same pattern as other tables)
CREATE POLICY "Allow all on user_presence" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);

-- Function to update presence (heartbeat)
CREATE OR REPLACE FUNCTION public.update_presence(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_presence (contact_id, last_seen_at, is_online)
  VALUES (p_contact_id, now(), true)
  ON CONFLICT (contact_id) 
  DO UPDATE SET last_seen_at = now(), is_online = true;
END;
$$;

-- Function for admin to update their presence
CREATE OR REPLACE FUNCTION public.update_admin_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin_id uuid;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RETURN; END IF;
  
  INSERT INTO user_presence (contact_id, last_seen_at, is_online)
  VALUES (v_admin_id, now(), true)
  ON CONFLICT (contact_id)
  DO UPDATE SET last_seen_at = now(), is_online = true;
END;
$$;

-- Function to get presence for a list of contact IDs
CREATE OR REPLACE FUNCTION public.get_user_presence(p_contact_ids uuid[])
RETURNS TABLE(contact_id uuid, last_seen_at timestamptz, is_online boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark users as offline if not seen in 2 minutes
  UPDATE user_presence 
  SET is_online = false 
  WHERE user_presence.last_seen_at < now() - interval '2 minutes' 
    AND user_presence.is_online = true;

  RETURN QUERY
    SELECT p.contact_id, p.last_seen_at, p.is_online
    FROM user_presence p
    WHERE p.contact_id = ANY(p_contact_ids);
END;
$$;

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
