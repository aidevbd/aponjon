
-- Helper: broadcast realtime update for both sides
CREATE OR REPLACE FUNCTION public._broadcast_msg_update(p_msg_id uuid, p_sender uuid, p_receiver uuid, p_event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_topic text;
BEGIN
  v_topic := 'msg:' || LEAST(p_sender::text, p_receiver::text) || ':' || GREATEST(p_sender::text, p_receiver::text);
  PERFORM realtime.send(
    jsonb_build_object('id', p_msg_id, 'sender_id', p_sender, 'receiver_id', p_receiver, 'event', p_event),
    'msg_update', v_topic, false
  );
END $$;

CREATE OR REPLACE FUNCTION public.react_to_message(p_token text, p_message_id uuid, p_emoji text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL THEN RETURN false; END IF;
  IF v_me <> v_msg.sender_id AND v_me <> v_msg.receiver_id THEN RAISE EXCEPTION 'Not a participant'; END IF;
  DELETE FROM public.message_reactions WHERE message_id = p_message_id AND reactor_id = v_me AND emoji = p_emoji;
  IF NOT FOUND THEN
    DELETE FROM public.message_reactions WHERE message_id = p_message_id AND reactor_id = v_me;
    INSERT INTO public.message_reactions(message_id, reactor_id, emoji) VALUES (p_message_id, v_me, p_emoji);
  END IF;
  PERFORM public._broadcast_msg_update(p_message_id, v_msg.sender_id, v_msg.receiver_id, 'reaction');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.react_to_message_admin(p_message_id uuid, p_emoji text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_admin := public.get_admin_contact_id();
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL THEN RETURN false; END IF;
  IF v_admin <> v_msg.sender_id AND v_admin <> v_msg.receiver_id THEN RAISE EXCEPTION 'Not a participant'; END IF;
  DELETE FROM public.message_reactions WHERE message_id = p_message_id AND reactor_id = v_admin AND emoji = p_emoji;
  IF NOT FOUND THEN
    DELETE FROM public.message_reactions WHERE message_id = p_message_id AND reactor_id = v_admin;
    INSERT INTO public.message_reactions(message_id, reactor_id, emoji) VALUES (p_message_id, v_admin, p_emoji);
  END IF;
  PERFORM public._broadcast_msg_update(p_message_id, v_msg.sender_id, v_msg.receiver_id, 'reaction');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.unsend_message(p_token text, p_message_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL OR v_msg.sender_id <> v_me THEN RETURN false; END IF;
  UPDATE public.messages SET unsent_at = now(), content = NULL, image_url = NULL WHERE id = p_message_id;
  PERFORM public._broadcast_msg_update(p_message_id, v_msg.sender_id, v_msg.receiver_id, 'unsend');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.unsend_message_admin(p_message_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_admin := public.get_admin_contact_id();
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL OR v_msg.sender_id <> v_admin THEN RETURN false; END IF;
  UPDATE public.messages SET unsent_at = now(), content = NULL, image_url = NULL WHERE id = p_message_id;
  PERFORM public._broadcast_msg_update(p_message_id, v_msg.sender_id, v_msg.receiver_id, 'unsend');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.remove_message_for_me(p_token text, p_message_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL THEN RETURN false; END IF;
  IF v_me <> v_msg.sender_id AND v_me <> v_msg.receiver_id THEN RAISE EXCEPTION 'Not a participant'; END IF;
  UPDATE public.messages SET deleted_for = array_append(array_remove(deleted_for, v_me), v_me) WHERE id = p_message_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.remove_message_for_me_admin(p_message_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_admin := public.get_admin_contact_id();
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL THEN RETURN false; END IF;
  UPDATE public.messages SET deleted_for = array_append(array_remove(deleted_for, v_admin), v_admin) WHERE id = p_message_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.edit_message(p_token text, p_message_id uuid, p_new_content text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL OR v_msg.sender_id <> v_me THEN RETURN false; END IF;
  IF v_msg.unsent_at IS NOT NULL THEN RETURN false; END IF;
  IF v_msg.content IS NOT NULL THEN
    INSERT INTO public.message_edit_history(message_id, previous_content, edited_at)
    VALUES (p_message_id, v_msg.content, COALESCE(v_msg.edited_at, v_msg.created_at));
  END IF;
  UPDATE public.messages SET
    original_content = COALESCE(original_content, v_msg.content),
    content = p_new_content,
    edited_at = now()
  WHERE id = p_message_id;
  PERFORM public._broadcast_msg_update(p_message_id, v_msg.sender_id, v_msg.receiver_id, 'edit');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.edit_admin_message(p_message_id uuid, p_new_content text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_admin := public.get_admin_contact_id();
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Not admin'; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL OR v_msg.sender_id <> v_admin THEN RETURN false; END IF;
  IF v_msg.unsent_at IS NOT NULL THEN RETURN false; END IF;
  IF v_msg.content IS NOT NULL THEN
    INSERT INTO public.message_edit_history(message_id, previous_content, edited_at)
    VALUES (p_message_id, v_msg.content, COALESCE(v_msg.edited_at, v_msg.created_at));
  END IF;
  UPDATE public.messages SET
    original_content = COALESCE(original_content, v_msg.content),
    content = p_new_content,
    edited_at = now()
  WHERE id = p_message_id;
  PERFORM public._broadcast_msg_update(p_message_id, v_msg.sender_id, v_msg.receiver_id, 'edit');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.get_message_edit_history(p_token text, p_message_id uuid)
RETURNS TABLE(previous_content text, edited_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid; v_msg public.messages%ROWTYPE;
BEGIN
  v_me := public.validate_chat_session(p_token);
  IF v_me IS NULL THEN RETURN; END IF;
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  IF v_msg.id IS NULL THEN RETURN; END IF;
  IF v_me <> v_msg.sender_id AND v_me <> v_msg.receiver_id THEN RETURN; END IF;
  RETURN QUERY SELECT h.previous_content, h.edited_at FROM public.message_edit_history h
    WHERE h.message_id = p_message_id ORDER BY h.edited_at ASC;
END $$;

CREATE OR REPLACE FUNCTION public.get_message_edit_history_admin(p_message_id uuid)
RETURNS TABLE(previous_content text, edited_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.get_admin_contact_id() IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT h.previous_content, h.edited_at FROM public.message_edit_history h
    WHERE h.message_id = p_message_id ORDER BY h.edited_at ASC;
END $$;

-- Ensure tables exist (safety net in case earlier failed migration didn't create them)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  reactor_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, reactor_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reactions' AND policyname='Deny direct write on reactions') THEN
    CREATE POLICY "Deny direct write on reactions" ON public.message_reactions FOR ALL USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reactions' AND policyname='Admins can read reactions') THEN
    CREATE POLICY "Admins can read reactions" ON public.message_reactions FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.auth_user_id = auth.uid() AND c.is_admin = true));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.message_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  previous_content text NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_edit_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_edit_history' AND policyname='Deny direct write on edit history') THEN
    CREATE POLICY "Deny direct write on edit history" ON public.message_edit_history FOR ALL USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_edit_history' AND policyname='Admins can read edit history') THEN
    CREATE POLICY "Admins can read edit history" ON public.message_edit_history FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.auth_user_id = auth.uid() AND c.is_admin = true));
  END IF;
END $$;
