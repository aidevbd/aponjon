CREATE OR REPLACE FUNCTION public.send_message(p_token text, p_receiver_id uuid, p_content text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_reply_to_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_msg_id uuid;
  v_topic text;
  v_user_topic text;
  v_payload jsonb;
BEGIN
  v_sender_id := public.validate_chat_session(p_token);
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF p_content IS NULL AND p_image_url IS NULL THEN RAISE EXCEPTION 'Empty message'; END IF;

  INSERT INTO messages (sender_id, receiver_id, content, image_url, reply_to_id)
  VALUES (v_sender_id, p_receiver_id, p_content, p_image_url, p_reply_to_id)
  RETURNING id INTO v_msg_id;

  v_payload := jsonb_build_object('id', v_msg_id, 'sender_id', v_sender_id, 'receiver_id', p_receiver_id);

  -- Per-thread topic (existing behaviour)
  v_topic := 'msg:' || LEAST(v_sender_id::text, p_receiver_id::text) || ':' || GREATEST(v_sender_id::text, p_receiver_id::text);
  PERFORM realtime.send(v_payload, 'new_message', v_topic, false);

  -- Per-receiver topic — allows a global listener (site-wide notifier) to
  -- react instantly without knowing all peers.
  v_user_topic := 'user:' || p_receiver_id::text;
  PERFORM realtime.send(v_payload, 'new_message', v_user_topic, false);

  RETURN v_msg_id;
END;
$function$;