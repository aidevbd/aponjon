import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export const ADMIN_TABS = ["dashboard", "contacts", "chat", "logs", "settings"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

/**
 * URL-synced admin tab state plus the layout flags derived from it
 * (immersive mobile chat, desktop fullscreen chat, auto-hiding tabs bar).
 */
export function useAdminTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useIsMobile();

  const urlTab = searchParams.get("tab");
  const activeTab = (ADMIN_TABS as readonly string[]).includes(urlTab || "")
    ? (urlTab as AdminTab)
    : "contacts";

  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "contacts") next.delete("tab"); else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const immersive = chatOpen && activeTab === "chat" && isMobile;
  const chatFullscreen = activeTab === "chat" && !isMobile;

  // Auto-hide the tabs bar on desktop when scrolling down; reveal at top.
  const [tabsHidden, setTabsHidden] = useState(false);
  useEffect(() => {
    if (isMobile || chatFullscreen) { setTabsHidden(false); return; }
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 8) setTabsHidden(false);
      else if (y > lastY + 4) setTabsHidden(true);
      else if (y < lastY - 4) setTabsHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, chatFullscreen, activeTab]);

  // Signal immersive state to the global bottom nav so it can hide.
  useEffect(() => {
    if (immersive) document.body.setAttribute("data-immersive", "true");
    else document.body.removeAttribute("data-immersive");
    return () => { document.body.removeAttribute("data-immersive"); };
  }, [immersive]);

  return { activeTab, setActiveTab, setChatOpen, immersive, chatFullscreen, tabsHidden };
}
