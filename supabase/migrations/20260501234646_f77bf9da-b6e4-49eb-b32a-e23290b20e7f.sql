CREATE OR REPLACE FUNCTION public.toggle_pin_message(p_message_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_msg record;
  v_topic text;
BEGIN
  v_admin_id := public.get_admin_contact_id();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;

  UPDATE messages SET is_pinned = NOT is_pinned
  WHERE id = p_message_id AND (sender_id = v_admin_id OR receiver_id = v_admin_id)
  RETURNING id, sender_id, receiver_id INTO v_msg;

  IF v_msg.id IS NOT NULL THEN
    v_topic := 'chat:' || LEAST(v_msg.sender_id::text, v_msg.receiver_id::text)
            || ':' || GREATEST(v_msg.sender_id::text, v_msg.receiver_id::text);
    PERFORM realtime.send(
      jsonb_build_object('id', v_msg.id, 'sender_id', v_msg.sender_id, 'receiver_id', v_msg.receiver_id, 'event', 'pin'),
      'msg_update',
      v_topic,
      false
    );
    RETURN true;
  END IF;
  RETURN false;
END;
$function$;