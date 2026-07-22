import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Handles jump-to-message scroll + transient highlight for the chat thread.
 */
export function useJumpToMessage(messageListRef: RefObject<HTMLElement>) {
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const jumpToMessage = useCallback((id: string) => {
    const container = messageListRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-msg-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(id);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedMsgId(null), 1800);
  }, [messageListRef]);

  useEffect(() => () => {
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
  }, []);

  return { highlightedMsgId, jumpToMessage };
}
