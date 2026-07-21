
CREATE OR REPLACE FUNCTION public.mark_conversation_read_admin(p_other_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid;
  v_count integer := 0;
  v_topic text;
BEGIN
  v_admin := public.get_admin_contact_id();
  IF v_admin IS NULL THEN RETURN 0; END IF;

  WITH updated AS (
    UPDATE public.messages
       SET is_read = true,
           read_at = COALESCE(read_at, now()),
           delivered_at = COALESCE(delivered_at, now())
     WHERE sender_id = p_other_id
       AND receiver_id = v_admin
       AND is_read = false
       AND unsent_at IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  IF v_count > 0 THEN
    v_topic := 'msg:' || LEAST(v_admin::text, p_other_id::text) || ':' || GREATEST(v_admin::text, p_other_id::text);
    PERFORM realtime.send(
      jsonb_build_object('sender_id', p_other_id, 'receiver_id', v_admin, 'event', 'read'),
      'msg_update', v_topic, false
    );
  END IF;
  RETURN v_count;
END $function$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read_admin(uuid) TO authenticated, service_role;
