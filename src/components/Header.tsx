import { Heart, ChevronLeft, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalChatNotifier } from "@/hooks/useGlobalChatNotifier";


export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdmin = location.pathname.startsWith("/admin");
  const isAdminLogin = location.pathname === "/admin" || location.pathname.startsWith("/admin/login");
  const isAdminDashboard = location.pathname.startsWith("/admin/dashboard");
  const isRoot = location.pathname === "/";
  const isChat = location.pathname.startsWith("/chat");
  const { totalUnread, hasSession } = useGlobalChatNotifier();

  // Where should the messenger icon take us?
  const adminOnChatTab = isAdminDashboard && searchParams.get("tab") === "chat";
  const chatHref = isAdmin ? "/admin/dashboard?tab=chat" : "/chat";
  const showChatIcon =
    !isChat &&
    !adminOnChatTab &&
    !isAdminLogin &&
    (isAdmin ? isAdminDashboard : hasSession);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };


  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 border-b border-border/50 bg-card"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
        {/* Mobile: back button on sub-pages */}
        {!isRoot && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="পিছনে যান"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent active:scale-95 transition sm:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <Link
          to="/"
          className={`flex items-center gap-2 group ${!isRoot ? "sm:ml-0" : ""}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full hero-gradient shadow-rose">
            <Heart className="h-4 w-4 text-primary-foreground fill-current" />
          </div>
          <span className="text-lg font-display font-semibold text-foreground">
            আপনজন
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {!isAdmin && (
            <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
              <Link
                to="/add"
                className="rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap"
              >
                তথ্য যোগ
              </Link>
              <Link
                to="/access"
                className="rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap"
              >
                আমার তথ্য
              </Link>
            </nav>
          )}

          {showChatIcon && (
            <Link
              to={chatHref}
              preventScrollReset={isAdmin}
              aria-label={totalUnread > 0 ? `চ্যাটে ${totalUnread}টি নতুন মেসেজ` : "চ্যাট খুলুন"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent active:scale-95 transition-transform duration-150 touch-manipulation will-change-transform"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <MessageCircle className="h-5 w-5" />
              <AnimatePresence>
                {!isAdmin && totalUnread > 0 && (
                  <motion.span
                    key={totalUnread}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18 }}
                    className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold))] px-1 text-[10px] font-semibold text-[hsl(var(--heirloom-ink))] shadow"
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          {/* Spacer to balance flex when only back button is on left */}
          {!isRoot && !showChatIcon && <span className="w-10 sm:hidden" aria-hidden />}
        </div>

      </div>
    </motion.header>
  );
}
