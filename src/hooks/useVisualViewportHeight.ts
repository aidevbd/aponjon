import { useEffect, useState } from "react";

/**
 * Returns the current visual viewport height in pixels.
 * On mobile browsers this shrinks when the on-screen keyboard opens,
 * unlike `100dvh` which can lag or not update at all on some Android Chrome builds.
 * Falls back to window.innerHeight if visualViewport is unavailable.
 */
export function useVisualViewportHeight(): number {
  const getHeight = () => {
    if (typeof window === "undefined") return 0;
    return window.visualViewport?.height ?? window.innerHeight;
  };

  const [height, setHeight] = useState<number>(getHeight);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const update = () => setHeight(getHeight());
    update();
    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return height;
}
