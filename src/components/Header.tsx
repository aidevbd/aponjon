import { Heart, ChevronLeft, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalChatNotifier } from "@/hooks/useGlobalChatNotifier";


export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");
  const isRoot = location.pathname === "/";

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

        {/* Spacer to balance flex when only back button is on left */}
        {!isRoot && <span className="w-10 sm:hidden" aria-hidden />}
      </div>
    </motion.header>
  );
}
