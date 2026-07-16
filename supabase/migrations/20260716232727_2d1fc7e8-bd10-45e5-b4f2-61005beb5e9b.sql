
-- 1. Add read_at column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Backfill: any already-read messages get read_at = created_at if null
UPDATE public.messages SET read_at = COALESCE(delivered_at, created_at)
WHERE is_read = true AND read_at IS NULL;

-- 2. Recreate get_messages including read_at + broadcast on read
DROP FUNCTION IF EXISTS public.get_messages(text, uuid);
CREATE OR REPLACE FUNCTION public.get_messages(p_token text, p_other_id uuid)
 RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamp with time zone, delivered_at timestamp with time zone, read_at timestamp with time zone, edited_at timestamp with time zone, original_content text, reply_to_id uuid, reply_content text, reply_sender_id uuid, is_pinned boolean, unsent_at timestamp with time zone, has_edit_history boolean, reactions jsonb)
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
  IF v_me IS NULL THEN RETURN; END IF;

  WITH updated AS (
    UPDATE public.messages m
       SET is_read = true,
           read_at = COALESCE(read_at, now()),
           delivered_at = COALESCE(delivered_at, now())
     WHERE m.sender_id = p_other_id
       AND m.receiver_id = v_me
       AND NOT m.is_read
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  IF v_count > 0 THEN
    v_topic := 'msg:' || LEAST(v_me::text, p_other_id::text) || ':' || GREATEST(v_me::text, p_other_id::text);
    PERFORM realtime.send(
      jsonb_build_object('sender_id', p_other_id, 'receiver_id', v_me, 'event', 'read'),
      'msg_update', v_topic, false
    );
  END IF;

  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at, m.delivered_at, m.read_at,
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

-- 3. Recreate get_admin_messages with read_at
DROP FUNCTION IF EXISTS public.get_admin_messages(uuid);
CREATE OR REPLACE FUNCTION public.get_admin_messages(p_other_id uuid)
 RETURNS TABLE(id uuid, sender_id uuid, receiver_id uuid, content text, image_url text, is_read boolean, created_at timestamp with time zone, delivered_at timestamp with time zone, read_at timestamp with time zone, deleted_by_sender boolean, edited_at timestamp with time zone, original_content text, reply_to_id uuid, reply_content text, reply_sender_id uuid, is_pinned boolean, unsent_at timestamp with time zone, has_edit_history boolean, reactions jsonb)
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
  IF v_admin IS NULL THEN RETURN; END IF;

  WITH updated AS (
    UPDATE public.messages m
       SET is_read = true,
           read_at = COALESCE(read_at, now()),
           delivered_at = COALESCE(delivered_at, now())
     WHERE m.sender_id = p_other_id
       AND m.receiver_id = v_admin
       AND NOT m.is_read
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

  RETURN QUERY
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_url, m.is_read, m.created_at, m.delivered_at, m.read_at,
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
