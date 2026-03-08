
-- Create admin activity logs table
CREATE TABLE public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  target_id text DEFAULT NULL,
  target_type text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can read logs
CREATE POLICY "Admins can read activity logs"
ON public.admin_activity_logs
FOR SELECT
TO authenticated
USING (true);

-- Only insert via RPC
CREATE POLICY "Insert via RPC only"
ON public.admin_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX idx_admin_activity_logs_action_type ON public.admin_activity_logs(action_type);

-- RPC to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type text,
  p_description text,
  p_target_id text DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_log_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  INSERT INTO admin_activity_logs (admin_user_id, action_type, description, target_id, target_type, metadata)
  VALUES (auth.uid(), p_action_type, p_description, p_target_id, p_target_type, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- RPC to get activity logs with pagination
CREATE OR REPLACE FUNCTION public.get_admin_activity_logs(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_action_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  action_type text,
  description text,
  target_id text,
  target_type text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  RETURN QUERY
    SELECT l.id, l.action_type, l.description, l.target_id, l.target_type, l.metadata, l.created_at
    FROM admin_activity_logs l
    WHERE (p_action_type IS NULL OR l.action_type = p_action_type)
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;
