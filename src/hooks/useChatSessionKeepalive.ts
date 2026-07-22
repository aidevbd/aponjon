import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getChatSession,
  touchChatSession,
  clearChatSession,
  CHAT_SESSION_CHANGED_EVENT,
} from "@/lib/chatSession";

const TOUCH_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const WARN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // warn when <24h left
const WARN_FLAG_KEY = "aponjon.chatExpiryWarnedAt";

/**
 * Keeps the chat session alive while the tab is visible:
 * - Sliding refresh every 10 min via touch_chat_session RPC
 * - Shows a one-time-per-day toast when expiry is <24h away
 * - Redirects to /verify?next=chat if the session becomes invalid
 */
export function useChatSessionKeepalive() {
  const navigate = useNavigate();
  const warnedRef = useRef(false);

  useEffect(() => {
    let stopped = false;

    const maybeWarn = (expiresAt: number) => {
      const remaining = expiresAt - Date.now();
      if (remaining > WARN_THRESHOLD_MS || remaining <= 0) return;
      // Only warn once per calendar day per browser
      const last = Number(localStorage.getItem(WARN_FLAG_KEY) || 0);
      const today = new Date().setHours(0, 0, 0, 0);
      if (last >= today) return;
      localStorage.setItem(WARN_FLAG_KEY, String(Date.now()));
      warnedRef.current = true;
      toast.message("সেশন শীঘ্রই শেষ হবে", {
        description: "সক্রিয় থাকতে চ্যাটে ঢুকুন বা আবার যাচাই করুন।",
      });
    };

    const tick = async () => {
      const s = getChatSession();
      if (!s) return;
      const newExp = await touchChatSession(s.token);
      if (stopped) return;
      if (newExp === null) {
        // Server says invalid — session was revoked or expired
        clearChatSession();
        toast.error("সেশন শেষ হয়েছে। আবার যাচাই করুন।");
        navigate("/verify?next=chat", { replace: true });
        return;
      }
      maybeWarn(newExp);
    };

    // initial run
    const s = getChatSession();
    if (s) maybeWarn(s.expiresAt);

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
      // If session was cleared elsewhere (e.g. sign out all), stop touching
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
