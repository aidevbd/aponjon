import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewMessage } from "@/lib/notificationPrefs";

type Params = {
  myContactId: string | undefined | null;
  otherContactId: string | undefined | null;
  onThreadEvent: () => void;
  onIncomingFromOther: (senderId: string) => void;
};

/**
 * Subscribes to the shared broadcast channel between two contacts and
 * fires callbacks when new messages / message updates arrive. Debounces
 * msg_update to 200ms to coalesce bursts (reactions, edits, delivery/read).
 */
export function useChatRealtime({
  myContactId,
  otherContactId,
  onThreadEvent,
  onIncomingFromOther,
}: Params) {
  const updateTimerRef = useRef<number | null>(null);
  // Keep latest callbacks in refs so we don't resubscribe on every render.
  const onThreadEventRef = useRef(onThreadEvent);
  const onIncomingRef = useRef(onIncomingFromOther);
  useEffect(() => { onThreadEventRef.current = onThreadEvent; }, [onThreadEvent]);
  useEffect(() => { onIncomingRef.current = onIncomingFromOther; }, [onIncomingFromOther]);

  useEffect(() => {
    if (!myContactId || !otherContactId) return;
    const sortedIds = [myContactId, otherContactId].sort();
    const topic = `msg:${sortedIds[0]}:${sortedIds[1]}`;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: "new_message" }, (payload) => {
        const data = payload.payload as { id: string; sender_id: string; receiver_id: string };
        if (!data) return;
        const inThread =
          (data.sender_id === otherContactId && data.receiver_id === myContactId) ||
          (data.sender_id === myContactId && data.receiver_id === otherContactId);
        if (inThread) onThreadEventRef.current();
        if (data.receiver_id === myContactId && data.sender_id !== myContactId) {
          notifyNewMessage();
        }
        if (data.receiver_id === myContactId && data.sender_id !== otherContactId) {
          onIncomingRef.current(data.sender_id);
        }
      })
      .on("broadcast", { event: "msg_update" }, (payload) => {
        const data = payload.payload as { sender_id: string; receiver_id: string };
        if (!data) return;
        const inThread =
          (data.sender_id === otherContactId && data.receiver_id === myContactId) ||
          (data.sender_id === myContactId && data.receiver_id === otherContactId);
        if (!inThread) return;
        if (updateTimerRef.current) return;
        updateTimerRef.current = window.setTimeout(() => {
          updateTimerRef.current = null;
          onThreadEventRef.current();
        }, 200);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [myContactId, otherContactId]);
}
