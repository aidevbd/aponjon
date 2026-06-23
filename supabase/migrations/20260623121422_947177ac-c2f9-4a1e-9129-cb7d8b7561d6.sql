
-- Admin-only functions: revoke anon, keep authenticated (body checks admin role)
REVOKE EXECUTE ON FUNCTION public.get_admin_contact_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_chat_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_messages(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_unread_counts() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.send_admin_message(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.send_admin_message(uuid, text, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_admin_message(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.edit_admin_message(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unsend_message_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.react_to_message_admin(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.remove_message_for_me_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_message_edit_history_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.toggle_pin_message(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_admin_presence() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.setup_admin_contact(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_admin_activity(text, text, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_activity_logs(integer, integer, text) FROM anon, public;

-- Internal helper functions: revoke from everyone (only callable inside other SECURITY DEFINER functions)
REVOKE EXECUTE ON FUNCTION public._broadcast_msg_update(uuid, uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_escalation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.current_chat_session_contact() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_presence(uuid[]) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_chat_session(text) FROM anon, authenticated, public;
