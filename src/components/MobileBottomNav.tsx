import { NavLink, useLocation, useSearchParams, Link } from "react-router-dom";
import {
  Home, UserPlus, ShieldCheck, MessageCircle,
  LayoutDashboard, Users, Activity, Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGlobalChatNotifier } from "@/hooks/useGlobalChatNotifier";

/**
 * Native-app-style bottom tab bar shown on mobile across the app.
 * - Public routes → user tabs (Home / Add / My info / Chat)
 * - /admin/dashboard → admin tabs (Overview / Contacts / Chat / Logs / Settings) via ?tab=
 * - Hidden on immersive states (open chat conversation, auth flows)
 */
export function MobileBottomNav() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { totalUnread, hasSession } = useGlobalChatNotifier();

  // Watch body[data-immersive] set by AdminDashboard when a chat conversation is open
  const [immersive, setImmersive] = useState(false);
  useEffect(() => {
    const check = () => setImmersive(document.body.getAttribute("data-immersive") === "true");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-immersive"] });
    return () => obs.disconnect();
  }, []);

  const isAdminDashboard = pathname.startsWith("/admin/dashboard");
  const isPublicChat = pathname.startsWith("/chat"); // has own bottom input
  const isAuthFlow =
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/.lovable/oauth") ||
    pathname === "/admin/login";

  const hidden = immersive || isPublicChat || isAuthFlow;

  // Reserve space at the bottom of the viewport
  useEffect(() => {
    if (hidden) {
      document.body.style.removeProperty("--mobile-bottom-nav-h");
      return;
    }
    document.body.style.setProperty(
      "--mobile-bottom-nav-h",
      "calc(env(safe-area-inset-bottom) + 4.25rem)",
    );
    return () => {
      document.body.style.removeProperty("--mobile-bottom-nav-h");
    };
  }, [hidden]);

  if (hidden) return null;

  type Tab = {
    key: string;
    to: string;
    label: string;
    icon: typeof Home;
    exact?: boolean;
    badge?: number;
    isActive?: boolean;
  };

  let tabs: Tab[] = [];

  if (isAdminDashboard) {
    const currentTab = searchParams.get("tab") || "contacts";
    tabs = [
      { key: "dashboard", to: "/admin/dashboard?tab=dashboard", label: "ওভারভিউ", icon: LayoutDashboard, isActive: currentTab === "dashboard" },
      { key: "contacts", to: "/admin/dashboard", label: "কন্টাক্ট", icon: Users, isActive: currentTab === "contacts" },
      { key: "chat", to: "/admin/dashboard?tab=chat", label: "চ্যাট", icon: MessageCircle, badge: totalUnread, isActive: currentTab === "chat" },
      { key: "logs", to: "/admin/dashboard?tab=logs", label: "লগ", icon: Activity, isActive: currentTab === "logs" },
      { key: "settings", to: "/admin/dashboard?tab=settings", label: "সেটিংস", icon: Settings, isActive: currentTab === "settings" },
    ];
  } else {
    tabs = [
      { key: "home", to: "/", label: "হোম", icon: Home, exact: true },
      { key: "add", to: "/add", label: "যোগ", icon: UserPlus },
      { key: "access", to: "/access", label: "আমার তথ্য", icon: ShieldCheck },
      ...(hasSession
        ? [{ key: "chat", to: "/chat", label: "চ্যাট", icon: MessageCircle, badge: totalUnread } as Tab]
        : []),
    ];
  }

  return (
    <motion.nav
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      aria-label="প্রধান নেভিগেশন"
      className="fixed inset-x-0 bottom-0 z-40 sm:hidden border-t border-[hsl(var(--heirloom-gold)/0.35)] bg-[hsl(var(--heirloom-bg)/0.96)] backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const badge = tab.badge || 0;
          const content = (isActive: boolean) => (
            <>
              <span className="relative">
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold))] px-1 text-[10px] font-semibold text-[hsl(var(--heirloom-ink))] shadow">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="leading-none">{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[hsl(var(--heirloom-gold))]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </>
          );

          const baseClasses = (isActive: boolean) =>
            [
              "relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
              isActive
                ? "text-[hsl(var(--heirloom-seal))]"
                : "text-[hsl(var(--heirloom-ink-mute))] hover:text-[hsl(var(--heirloom-ink))]",
            ].join(" ");

          return (
            <li key={tab.key} className="flex-1">
              {isAdminDashboard ? (
                <Link to={tab.to} className={baseClasses(!!tab.isActive)}>
                  {content(!!tab.isActive)}
                </Link>
              ) : (
                <NavLink to={tab.to} end={tab.exact} className={({ isActive }) => baseClasses(isActive)}>
                  {({ isActive }) => content(isActive)}
                </NavLink>
              )}
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
