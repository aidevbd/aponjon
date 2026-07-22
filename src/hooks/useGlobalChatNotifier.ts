import { useEffect, useRef, useState } from "react";
import { CHAT_SESSION_CHANGED_EVENT, getChatSession, getUnreadCounts } from "@/lib/chatSession";
import { notifyNewMessage } from "@/lib/notificationPrefs";
import { toast } from "sonner";

const POLL_MS = 15000;
const SEEN_KEY = "aponjon.lastSeenUnread.v1";

function loadSeen(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; }
  catch { return {}; }
}
function saveSeen(map: Record<string, number>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch {}
}

/**
 * Site-wide unread poller for logged-in chat users.
 * - Polls unread counts every 15s (only when tab is visible)
 * - Fires sound/vibration + toast + browser Notification when new messages arrive
 * - Returns total unread count for badges
 * - Suppresses alerts while the user is actively on /chat
 */
export function useGlobalChatNotifier() {
  const [totalUnread, setTotalUnread] = useState<number>(() =>
    Object.values(loadSeen()).reduce((a, b) => a + (Number(b) || 0), 0),
  );
  const [hasSession, setHasSession] = useState<boolean>(() => !!getChatSession());
  const seenRef = useRef<Record<string, number>>(loadSeen());
  // If we have a persisted baseline from a previous session, treat the first
  // poll as a real diff so messages that arrived while the tab was closed
  // still trigger a notification.
  const firstRunRef = useRef(Object.keys(loadSeen()).length === 0);

  useEffect(() => {
    // Re-check session on focus / storage changes
    const refreshSession = () => setHasSession(!!getChatSession());
    window.addEventListener("focus", refreshSession);
    window.addEventListener("storage", refreshSession);
    window.addEventListener(CHAT_SESSION_CHANGED_EVENT, refreshSession);
    return () => {
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener(CHAT_SESSION_CHANGED_EVENT, refreshSession);
    };
  }, []);

  useEffect(() => {
    if (!hasSession) {
      setTotalUnread(0);
      return;
    }

    // Ask for browser notification permission once (best-effort)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }

    let stopped = false;

    const tick = async () => {
      const session = getChatSession();
      if (!session) { setHasSession(false); return; }
      try {
        const rows = await getUnreadCounts(session.token);
        if (stopped) return;

        const nextMap: Record<string, number> = {};
        let total = 0;
        for (const r of rows) {
          nextMap[r.sender_id] = Number(r.unread_count) || 0;
          total += nextMap[r.sender_id];
        }
        setTotalUnread(total);

        const onChatPage = window.location.pathname.startsWith("/chat");
        const prev = seenRef.current;

        // Detect newly-arrived unread messages (any sender whose count increased)
        let hasNew = false;
        for (const [sid, count] of Object.entries(nextMap)) {
          if (count > (prev[sid] || 0)) hasNew = true;
        }

        // Skip the very first poll (baseline) and while user is on chat page
        if (hasNew && !firstRunRef.current && !onChatPage) {
          notifyNewMessage();
          toast.message("নতুন মেসেজ এসেছে 💌", {
            description: "চ্যাট খুলে দেখুন",
            action: {
              label: "খুলুন",
              onClick: () => { window.location.href = "/chat"; },
            },
          });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const n = new Notification("আপনজন — নতুন মেসেজ", {
                body: "চ্যাটে নতুন মেসেজ এসেছে",
                icon: "/favicon.ico",
                tag: "aponjon-chat",
              });
              n.onclick = () => { window.focus(); window.location.href = "/chat"; };
            } catch {}
          }
        }

        seenRef.current = nextMap;
        saveSeen(nextMap);
        firstRunRef.current = false;
      } catch {
        // ignore transient errors
      }
    };

    // Run immediately, then on interval — only when tab is visible
    let interval: number | null = null;
    const start = () => {
      if (interval != null) return;
      void tick();
      interval = window.setInterval(tick, POLL_MS);
    };
    const stop = () => {
      if (interval != null) { window.clearInterval(interval); interval = null; }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopped = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hasSession]);

  return { totalUnread, hasSession };
}
