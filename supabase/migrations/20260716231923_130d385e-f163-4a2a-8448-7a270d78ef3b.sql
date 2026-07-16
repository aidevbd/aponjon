-- 1. Add delivered_at column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- 2. Drop existing functions before recreating with new return signature
DROP FUNCTION IF EXISTS public.get_messages(text, uuid);
DROP FUNCTION IF EXISTS public.get_admin_messages(uuid);

-- 3. Recreate get_messages with delivered_at
CREATE OR REPLACE FUNCTION public.get_messages(p_token text, p_other_id uuid)
 RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamp with time zone, delivered_at timestamp with time zone, edited_at timestamp with time zone, original_content text, reply_to_id uuid, reply_content text, reply_sender_id uuid, is_pinned boolean, unsent_at timestamp with time zone, has_edit_history boolean, reactions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_me uuid;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RETURN; END IF;

  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_me AND NOT m.is_read;

  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at, m.delivered_at,
      m.edited_at, m.original_content, m.reply_to_id,
      r.content AS reply_content, r.sender_id AS reply_sender_id, m.is_pinned,
      m.unsent_at,
      EXISTS(SELECT 1 FROM public.message_edit_history h WHERE h.message_id = m.id) AS has_edit_history,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('emoji', mr.emoji, 'reactor_id', mr.reactor_id))
        FROM public.message_reactions mr WHERE mr.message_id = m.id
      ), '[]'::jsonb) AS reactions
    FROM public.messages m
    LEFT JOIN public.messages r ON r.id = m.reply_to_id
    WHERE ((m.sender_id = v_me AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_me))
      AND NOT m.deleted_by_sender
      AND NOT (v_me = ANY(m.deleted_for))
    ORDER BY m.created_at ASC;
END $function$;

-- 4. Recreate get_admin_messages with delivered_at
CREATE OR REPLACE FUNCTION public.get_admin_messages(p_other_id uuid)
 RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamp with time zone, delivered_at timestamp with time zone, deleted_by_sender boolean, edited_at timestamp with time zone, original_content text, reply_to_id uuid, reply_content text, reply_sender_id uuid, is_pinned boolean, unsent_at timestamp with time zone, has_edit_history boolean, reactions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_admin uuid;
BEGIN
  v_admin := public.get_admin_contact_id();
  IF v_admin IS NULL THEN RETURN; END IF;

  UPDATE messages m SET is_read = true
  WHERE m.sender_id = p_other_id AND m.receiver_id = v_admin AND NOT m.is_read;

  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at, m.delivered_at,
      m.deleted_by_sender, m.edited_at, m.original_content, m.reply_to_id,
      r.content AS reply_content, r.sender_id AS reply_sender_id, m.is_pinned,
      m.unsent_at,
      EXISTS(SELECT 1 FROM public.message_edit_history h WHERE h.message_id = m.id) AS has_edit_history,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('emoji', mr.emoji, 'reactor_id', mr.reactor_id))
        FROM public.message_reactions mr WHERE mr.message_id = m.id
      ), '[]'::jsonb) AS reactions
    FROM public.messages m
    LEFT JOIN public.messages r ON r.id = m.reply_to_id
    WHERE ((m.sender_id = v_admin AND m.receiver_id = p_other_id)
       OR (m.sender_id = p_other_id AND m.receiver_id = v_admin))
      AND NOT (v_admin = ANY(m.deleted_for))
    ORDER BY m.created_at ASC;
END $function$;

-- 5. Batch mark: chat session user marks all received messages from p_other_id as delivered
CREATE OR REPLACE FUNCTION public.mark_conversation_delivered(p_token text, p_other_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
  v_count integer := 0;
  v_topic text;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RETURN 0; END IF;

  WITH updated AS (
    UPDATE public.messages
       SET delivered_at = now()
     WHERE sender_id = p_other_id
       AND receiver_id = v_me
       AND delivered_at IS NULL
       AND unsent_at IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  IF v_count > 0 THEN
    v_topic := 'msg:' || LEAST(v_me::text, p_other_id::text) || ':' || GREATEST(v_me::text, p_other_id::text);
    PERFORM realtime.send(
      jsonb_build_object('sender_id', p_other_id, 'receiver_id', v_me, 'event', 'delivered'),
      'msg_update', v_topic, false
    );
  END IF;
  RETURN v_count;
END $function$;

-- 6. Same for admin
CREATE OR REPLACE FUNCTION public.mark_conversation_delivered_admin(p_other_id uuid)
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
       SET delivered_at = now()
     WHERE sender_id = p_other_id
       AND receiver_id = v_admin
       AND delivered_at IS NULL
       AND unsent_at IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  IF v_count > 0 THEN
    v_topic := 'msg:' || LEAST(v_admin::text, p_other_id::text) || ':' || GREATEST(v_admin::text, p_other_id::text);
    PERFORM realtime.send(
      jsonb_build_object('sender_id', p_other_id, 'receiver_id', v_admin, 'event', 'delivered'),
      'msg_update', v_topic, false
    );
  END IF;
  RETURN v_count;
END $function$;

-- 7. Grants
GRANT EXECUTE ON FUNCTION public.mark_conversation_delivered(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_delivered_admin(uuid) TO authenticated;