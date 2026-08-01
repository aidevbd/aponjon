import { useEffect, useRef, useState } from "react";
import { CHAT_SESSION_CHANGED_EVENT, getChatSession, getUnreadCounts } from "@/lib/chatSession";
import { notifyNewMessage } from "@/lib/notificationPrefs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LetterArrivedToast } from "@/components/chat/LetterArrivedToast";
import { swallow } from "@/lib/devLog";

// Polling is now a slow fallback; realtime broadcast on user:<id> is the
// primary trigger. 30s reconciles unread counts without draining the API.
const POLL_MS = 30000;
const SEEN_KEY = "aponjon.lastSeenUnread.v1";
const LETTER_TOAST_ID = "aponjon-letter-toast";

function loadSeen(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; }
  catch { return {}; }
}
function saveSeen(map: Record<string, number>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch (e) { swallow("useGlobalChatNotifier.saveSeen", e); }
}

function showLetterToast(count: number) {
  const onChatPage = typeof window !== "undefined" && window.location.pathname.startsWith("/chat");
  if (onChatPage) return;

  notifyNewMessage();

  toast.custom(
    (id) => (
      <LetterArrivedToast
        toastId={id}
        count={count}
        onOpen={() => { window.location.href = "/chat"; }}
      />
    ),
    {
      id: LETTER_TOAST_ID,
      duration: 4000,
      position: "top-center",
      // Render our pill as-is: no sonner wrapper background, border, or shadow
      // — this is what was causing the "card behind a card" stacked look.
      unstyled: true,
      classNames: { toast: "bg-transparent border-0 shadow-none p-0" },
    },
  );

  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    document.visibilityState === "hidden"
  ) {
    try {
      const n = new Notification("আপনজন — নতুন চিঠি", {
        body: count > 1 ? `${count}টি নতুন মেসেজ এসেছে` : "চ্যাটে নতুন মেসেজ এসেছে",
        icon: "/favicon.ico",
        tag: "aponjon-chat",
        silent: true,
      });
      n.onclick = () => { window.focus(); window.location.href = "/chat"; };
    } catch (e) { swallow("useGlobalChatNotifier.browserNotification", e); }
  }
}

/**
 * Site-wide chat notifier for logged-in users.
 * - Primary: realtime broadcast on `user:<myContactId>` — instant push.
 * - Fallback: unread-count poll every 30s (also reconciles badge/count).
 */
export function useGlobalChatNotifier() {
  const [totalUnread, setTotalUnread] = useState<number>(() =>
    Object.values(loadSeen()).reduce((a, b) => a + (Number(b) || 0), 0),
  );
  const [hasSession, setHasSession] = useState<boolean>(() => !!getChatSession());
  const seenRef = useRef<Record<string, number>>(loadSeen());
  const firstRunRef = useRef(Object.keys(loadSeen()).length === 0);
  // Buffers realtime pushes that land between poll ticks so the badge count
  // doesn't lag behind the toast.
  const pendingBoostRef = useRef(0);

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
      try { Notification.requestPermission().catch((e) => swallow("useGlobalChatNotifier.requestPermission", e)); } catch (e) { swallow("useGlobalChatNotifier.requestPermission", e); }
    }

    let stopped = false;
    const session = getChatSession();
    const myId = session?.contactId;

    // ---- Realtime push channel ---------------------------------------
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (myId) {
      channel = supabase
        .channel(`user:${myId}`, { config: { private: false } })
        .on("broadcast", { event: "new_message" }, (payload) => {
          const data = payload.payload as { sender_id?: string; receiver_id?: string };
          if (!data || data.receiver_id !== myId) return;
          if (data.sender_id === myId) return;

          pendingBoostRef.current += 1;
          setTotalUnread((t) => t + 1);
          showLetterToast(pendingBoostRef.current);
        })
        .subscribe();
    }

    // ---- Fallback poll ------------------------------------------------
    const tick = async () => {
      const s = getChatSession();
      if (!s) { setHasSession(false); return; }
      try {
        const rows = await getUnreadCounts(s.token);
        if (stopped) return;

        const nextMap: Record<string, number> = {};
        let total = 0;
        for (const r of rows) {
          nextMap[r.sender_id] = Number(r.unread_count) || 0;
          total += nextMap[r.sender_id];
        }
        setTotalUnread(total);
        // Realtime already surfaced these, so clear the buffer.
        pendingBoostRef.current = 0;

        const onChatPage = window.location.pathname.startsWith("/chat");
        const prev = seenRef.current;

        let newCount = 0;
        for (const [sid, count] of Object.entries(nextMap)) {
          const delta = count - (prev[sid] || 0);
          if (delta > 0) newCount += delta;
        }

        // Only fire poll-driven toast if realtime missed it (e.g. socket down).
        if (newCount > 0 && !firstRunRef.current && !onChatPage) {
          showLetterToast(newCount);
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
      if (channel) supabase.removeChannel(channel);
    };
  }, [hasSession]);

  return { totalUnread, hasSession };
}
