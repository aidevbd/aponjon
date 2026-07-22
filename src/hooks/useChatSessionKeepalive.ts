import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getChatSession,
  touchChatSession,
  clearChatSession,
  CHAT_SESSION_CHANGED_EVENT,
} from "@/lib/chatSession";

const TOUCH_INTERVAL_MS = 10 * 60 * 1000; // 10 min

/**
 * Keeps the chat session alive while the tab is visible:
 * - Sliding refresh every 10 min via touch_chat_session RPC
 * - Silently redirects to /verify?next=chat if the session becomes invalid
 *
 * No pre-expiry toast — active users get slid forward automatically, and the
 * passive hint on /me lets users promote a device to 30-day trusted with one tap.
 */
export function useChatSessionKeepalive() {
  const navigate = useNavigate();

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      const s = getChatSession();
      if (!s) return;
      const newExp = await touchChatSession(s.token);
      if (stopped) return;
      if (newExp === null) {
        clearChatSession();
        navigate("/verify?next=chat", { replace: true });
      }
    };

    let interval: number | null = null;
    const start = () => {
      if (interval != null) return;
      void tick();
      interval = window.setInterval(tick, TOUCH_INTERVAL_MS);
    };
    const stop = () => {
      if (interval != null) { window.clearInterval(interval); interval = null; }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    const onSession = () => {
      if (!getChatSession()) stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(CHAT_SESSION_CHANGED_EVENT, onSession);

    return () => {
      stopped = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(CHAT_SESSION_CHANGED_EVENT, onSession);
    };
  }, [navigate]);
}
