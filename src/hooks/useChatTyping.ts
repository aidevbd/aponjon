import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Manages the typing indicator broadcast channel for a 1:1 chat thread.
 * Returns whether the other side is currently typing, plus an `emitTyping`
 * function to broadcast our own typing state (throttled to once per 2s).
 */
export function useChatTyping(
  myContactId: string | undefined | null,
  otherContactId: string | undefined | null,
) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    if (!myContactId || !otherContactId) {
      setIsOtherTyping(false);
      channelRef.current = null;
      return;
    }
    const channelName = `typing:${[myContactId, otherContactId].sort().join(":")}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_id === otherContactId) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      setIsOtherTyping(false);
    };
  }, [myContactId, otherContactId]);

  const emitTyping = useCallback(() => {
    if (!myContactId || !otherContactId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    const channel = channelRef.current;
    if (!channel) return;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { sender_id: myContactId },
    });
  }, [myContactId, otherContactId]);

  return { isOtherTyping, emitTyping };
}
