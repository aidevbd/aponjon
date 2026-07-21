import { NavLink, useLocation } from "react-router-dom";
import { Home, UserPlus, ShieldCheck, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useGlobalChatNotifier } from "@/hooks/useGlobalChatNotifier";

/**
 * Native-app-style bottom tab bar shown only on mobile for public user routes.
 * Hidden on admin, chat (uses immersive full-screen), and auth flows.
 */
export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { totalUnread, hasSession } = useGlobalChatNotifier();

  const hiddenOn =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/.lovable/oauth");

  // Reserve space at the bottom of the viewport so page content isn't hidden
  useEffect(() => {
    if (hiddenOn) {
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
  }, [hiddenOn]);

  if (hiddenOn) return null;

  const tabs = [
    { to: "/", label: "হোম", icon: Home, exact: true },
    { to: "/add", label: "যোগ", icon: UserPlus },
    { to: "/access", label: "আমার তথ্য", icon: ShieldCheck },
    ...(hasSession
      ? [{ to: "/chat", label: "চ্যাট", icon: MessageCircle, badge: totalUnread }]
      : []),
  ] as const;

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
          const badge = "badge" in tab ? (tab as any).badge : 0;
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={"exact" in tab ? (tab as any).exact : false}
                className={({ isActive }) =>
                  [
                    "relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                    isActive
                      ? "text-[hsl(var(--heirloom-seal))]"
                      : "text-[hsl(var(--heirloom-ink-mute))] hover:text-[hsl(var(--heirloom-ink))]",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
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
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
