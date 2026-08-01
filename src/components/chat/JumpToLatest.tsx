import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface JumpToLatestProps {
  show: boolean;
  count?: number;
  onClick: () => void;
  className?: string;
}

/**
 * Messenger-style floating "jump to latest" chip. Uses app theme tokens (primary) so it
 * fits the Rose/Coral heirloom palette instead of Messenger's blue.
 */
export function JumpToLatest({ show, count = 0, onClick, className }: JumpToLatestProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={onClick}
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.7 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-20",
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
            "bg-primary text-primary-foreground shadow-rose backdrop-blur-sm",
            "text-xs font-medium",
            "hover:brightness-110 transition-[filter]",
            className,
          )}
          aria-label={count > 0 ? `${count} নতুন মেসেজ — নিচে যান` : "সর্বশেষে যান"}
        >
          <AnimatePresence mode="popLayout">
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-foreground/20 text-micro font-bold"
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
          <span>{count > 0 ? "নতুন মেসেজ" : "নিচে যান"}</span>
          <motion.span
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
