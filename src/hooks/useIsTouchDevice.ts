import { useEffect, useState } from "react";

/**
 * True on touch-primary devices (phones, tablets) where the on-screen keyboard's
 * Enter key should insert a newline rather than submit. Uses `(pointer: coarse)`
 * so it doesn't misclassify a narrow desktop window as mobile.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsTouch(mql.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return isTouch;
}
