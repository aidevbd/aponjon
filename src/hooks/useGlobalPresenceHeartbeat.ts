import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getChatSession, CHAT_SESSION_CHANGED_EVENT } from "@/lib/chatSession";
import { swallow } from "@/lib/devLog";

/**
 * Sends a presence heartbeat every 30s whenever a chat session exists,
 * regardless of which page the user is on. This makes previously-known
 * contacts appear "online" to the admin as soon as they visit the site.
 * Pauses when the tab is hidden.
 */
export function useGlobalPresenceHeartbeat() {
  const [session, setSession] = useState(() => getChatSession());

  useEffect(() => {
    const sync = () => setSession(getChatSession());
    window.addEventListener(CHAT_SESSION_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHAT_SESSION_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let stopped = false;
    const beat = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("update_presence", {
          p_token: session.token,
          p_contact_id: session.contactId,
        } as any);
      } catch (e) { swallow("useGlobalPresenceHeartbeat.update_presence", e); }
    };
    beat();
    const interval = setInterval(beat, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.token, session?.contactId]);
}
