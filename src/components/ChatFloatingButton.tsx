import { Link, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalChatNotifier } from "@/hooks/useGlobalChatNotifier";

/**
 * Site-wide floating chat button.
 * - Only shown when the user has an active chat session
 * - Hidden on chat pages themselves and on admin routes
 * - Displays an unread-count badge that pulses when new messages arrive
 */
export function ChatFloatingButton() {
  const { totalUnread, hasSession } = useGlobalChatNotifier();
  const location = useLocation();

  const onChatPage = location.pathname.startsWith("/chat");
  const onAdmin = location.pathname.startsWith("/admin");
  const onAuth = ["/forgot-password", "/reset-password", "/.lovable/oauth/consent"].some((p) =>
    location.pathname.startsWith(p),
  );

  if (!hasSession || onChatPage || onAdmin || onAuth) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="fixed z-40 right-4 sm:right-6 hidden sm:block"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
    >
      <Link
        to="/chat"
        aria-label={totalUnread > 0 ? `চ্যাটে ${totalUnread}টি নতুন মেসেজ` : "চ্যাট খুলুন"}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-rose transition-transform hover:scale-105 active:scale-95"
      >
        <Mail className="h-6 w-6" />
        <AnimatePresence>
          {totalUnread > 0 && (
            <motion.span
              key={totalUnread}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold))] px-1 text-[11px] font-semibold text-[hsl(var(--heirloom-ink))] shadow-md"
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </motion.span>
          )}
        </AnimatePresence>
        {totalUnread > 0 && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping"
          />
        )}
      </Link>
    </motion.div>
  );
}
