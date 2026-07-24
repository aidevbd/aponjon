import { useEffect, useRef, useState } from "react";
import { CHAT_SESSION_CHANGED_EVENT, getChatSession, getUnreadCounts } from "@/lib/chatSession";
import { notifyNewMessage } from "@/lib/notificationPrefs";
import { toast } from "sonner";
import { LetterArrivedToast } from "@/components/chat/LetterArrivedToast";

const POLL_MS = 5000;
const SEEN_KEY = "aponjon.lastSeenUnread.v1";
const LETTER_TOAST_ID = "aponjon-letter-toast";

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
 * - Fires sound/vibration + heirloom letter toast when new messages arrive
 * - Sends browser Notification only when the tab is hidden (no duplicates)
 * - Suppresses alerts while the user is actively on /chat
 * - Returns total unread count for badges
 */
export function useGlobalChatNotifier() {
  const [totalUnread, setTotalUnread] = useState<number>(() =>
    Object.values(loadSeen()).reduce((a, b) => a + (Number(b) || 0), 0),
  );
  const [hasSession, setHasSession] = useState<boolean>(() => !!getChatSession());
  const seenRef = useRef<Record<string, number>>(loadSeen());
  const firstRunRef = useRef(Object.keys(loadSeen()).length === 0);

  useEffect(() => {
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

        // Count newly-arrived messages across all senders (batched).
        let newCount = 0;
        for (const [sid, count] of Object.entries(nextMap)) {
          const delta = count - (prev[sid] || 0);
          if (delta > 0) newCount += delta;
        }

        if (newCount > 0 && !firstRunRef.current && !onChatPage) {
          notifyNewMessage();

          // Heirloom letter card — single stable id so repeat arrivals
          // update the same card instead of stacking new ones.
          toast.custom(
            (id) => (
              <LetterArrivedToast
                toastId={id}
                count={newCount}
                onOpen={() => { window.location.href = "/chat"; }}
              />
            ),
            { id: LETTER_TOAST_ID, duration: 4000, position: "top-center" },
          );

          // OS-level notification — only when tab is hidden (avoid duplicate).
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState === "hidden"
          ) {
            try {
              const n = new Notification("আপনজন — নতুন চিঠি", {
                body: newCount > 1 ? `${newCount}টি নতুন মেসেজ এসেছে` : "চ্যাটে নতুন মেসেজ এসেছে",
                icon: "/favicon.ico",
                tag: "aponjon-chat",
                silent: true,
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

