import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Messenger-style smart auto-scroll.
 * - Auto-scrolls only if the user is already near the bottom, OR the newest message is their own.
 * - Otherwise increments a "new below" counter so the UI can show a jump-to-latest chip.
 * - When the user manually scrolls back to the bottom, the counter clears.
 */
export function useSmartAutoScroll<T extends { id: string; sender_id: string }>(
  containerRef: React.RefObject<HTMLElement>,
  messages: T[],
  myId: string | null | undefined,
  threshold = 100,
) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newBelowCount, setNewBelowCount] = useState(0);
  const lastIdRef = useRef<string | null>(null);
  const prevLenRef = useRef<number>(0);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= threshold;
  }, [containerRef, threshold]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewBelowCount(0);
  }, [containerRef]);

  // Track scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = checkNearBottom();
      setIsNearBottom(near);
      if (near) setNewBelowCount(0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef, checkNearBottom]);

  // React to messages changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;

    // Initial load / thread switch: jump instantly, no counter.
    if (lastIdRef.current === null && lastId) {
      lastIdRef.current = lastId;
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      });
      setNewBelowCount(0);
      return;
    }

    if (!grew || !last || lastId === lastIdRef.current) return;
    lastIdRef.current = lastId;

    const mine = myId && last.sender_id === myId;
    const near = checkNearBottom();

    if (mine || near) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
      setNewBelowCount(0);
    } else {
      setNewBelowCount((n) => n + 1);
    }
  }, [messages, myId, containerRef, checkNearBottom]);

  // Reset when container ref detaches (thread switch handled by consumer resetting messages).
  const resetForNewThread = useCallback(() => {
    lastIdRef.current = null;
    prevLenRef.current = 0;
    setNewBelowCount(0);
    setIsNearBottom(true);
  }, []);

  return { isNearBottom, newBelowCount, scrollToBottom, resetForNewThread };
}
