import { Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full hero-gradient shadow-rose">
            <Heart className="h-4 w-4 text-primary-foreground fill-current" />
          </div>
          <span className="text-lg font-display font-semibold text-foreground">
            আপনজন
          </span>
        </Link>

        {!isAdmin && (
          <nav className="flex items-center gap-2">
            <Link
              to="/add"
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              তথ্য যোগ করুন
            </Link>
            <Link
              to="/access"
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              আমার তথ্য
            </Link>
          </nav>
        )}
      </div>
    </motion.header>
  );
}
