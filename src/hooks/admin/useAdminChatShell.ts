import { useEffect, useState, type RefObject, type MutableRefObject } from "react";

interface Options {
  shellRef: RefObject<HTMLDivElement>;
  messageListRef: RefObject<HTMLDivElement>;
  /** Ref holding the currently open thread (null when the list is shown). */
  selectedUserRef: MutableRefObject<{ id: string } | null>;
  isTouchRef: MutableRefObject<boolean>;
  restoreInputFocus: (force?: boolean) => void;
  isMobile: boolean;
  viewportHeight: number | null;
  hasSelectedUser: boolean;
}

/**
 * Measures the admin chat shell against the visual viewport so the composer
 * never gets pushed under the keyboard, and locks body scroll in mobile
 * thread mode.
 */
export function useAdminChatShell({
  shellRef,
  messageListRef,
  selectedUserRef,
  isTouchRef,
  restoreInputFocus,
  isMobile,
  viewportHeight,
  hasSelectedUser,
}: Options) {
  const [shellTop, setShellTop] = useState(0);
  const [visualViewportOffsetTop, setVisualViewportOffsetTop] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setVisualViewportOffsetTop(window.visualViewport?.offsetTop ?? 0);
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const el = shellRef.current;
      if (!el) return;
      // When a chat thread is open the dashboard enters immersive mode
      // (header + tabs hidden), so the shell should own the full viewport.
      if (selectedUserRef.current) {
        setShellTop(0);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Ignore stale zero-height measurements from hidden TabsContent —
      // otherwise the shell overflows the viewport and hides the input.
      if (rect.height === 0 && rect.top === 0) return;
      setShellTop(Math.max(0, rect.top));
    };

    measure();
    // Re-measure across a few animation frames so we catch the moment the
    // Radix TabsContent flips from hidden -> visible.
    const rafIds: number[] = [];
    const scheduleRaf = () => {
      const id = requestAnimationFrame(() => {
        measure();
        if (rafIds.length < 6) scheduleRaf();
      });
      rafIds.push(id);
    };
    scheduleRaf();
    const timeouts = [50, 200, 500].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && shellRef.current) {
      ro = new ResizeObserver(() => measure());
      ro.observe(shellRef.current);
      if (document.body) ro.observe(document.body);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && shellRef.current) {
      io = new IntersectionObserver((entries) => {
        measure();
        // When the chat shell becomes visible (e.g. after switching Tabs),
        // auto-focus the input and pin scroll to the latest message.
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            if (selectedUserRef.current && !isTouchRef.current) {
              restoreInputFocus(true);
            }
            requestAnimationFrame(() => {
              const list = messageListRef.current;
              if (list) list.scrollTop = list.scrollHeight;
            });
          }
        }
      }, { threshold: [0, 0.1] });
      io.observe(shellRef.current);
    }

    return () => {
      rafIds.forEach((id) => cancelAnimationFrame(id));
      timeouts.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      ro?.disconnect();
      io?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportHeight, isMobile]);

  // Lock the page behind the immersive mobile thread view.
  useEffect(() => {
    if (!isMobile || !hasSelectedUser) return;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isMobile, hasSelectedUser]);

  return { shellTop, setShellTop, visualViewportOffsetTop };
}
