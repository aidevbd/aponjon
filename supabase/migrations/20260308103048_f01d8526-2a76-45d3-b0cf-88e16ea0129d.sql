
-- Create rate_limit_attempts table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  action_type text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_action ON public.rate_limit_attempts(key, action_type, attempted_at);

-- Enable RLS
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (needed for rate limit tracking)
CREATE POLICY "Allow all operations on rate_limit_attempts" ON public.rate_limit_attempts FOR ALL USING (true) WITH CHECK (true);

-- Create check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_blocked_until timestamptz;
BEGIN
  -- Clean old attempts (older than 1 hour)
  DELETE FROM rate_limit_attempts WHERE attempted_at < now() - interval '1 hour';

  -- Check if blocked (5 attempts in 15 minutes = blocked for 30 minutes)
  SELECT count(*) INTO v_count
  FROM rate_limit_attempts
  WHERE key = p_key AND action_type = p_action_type AND attempted_at > now() - interval '15 minutes';

  IF v_count >= 5 THEN
    -- Check if 30 min block has passed since last attempt
    SELECT max(attempted_at) INTO v_blocked_until
    FROM rate_limit_attempts
    WHERE key = p_key AND action_type = p_action_type;
    
    IF v_blocked_until + interval '30 minutes' > now() THEN
      RETURN FALSE;
    ELSE
      -- Block period passed, reset
      DELETE FROM rate_limit_attempts WHERE key = p_key AND action_type = p_action_type;
    END IF;
  END IF;

  -- Record attempt
  INSERT INTO rate_limit_attempts (key, action_type) VALUES (p_key, p_action_type);
  RETURN TRUE;
END;
$$;

-- Create reset_rate_limit function
CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_key text, p_action_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_attempts WHERE key = p_key AND action_type = p_action_type;
END;
$$;

-- Create otp_codes table if not exists
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '10 minutes'
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on otp_codes" ON public.otp_codes FOR ALL USING (true) WITH CHECK (true);
