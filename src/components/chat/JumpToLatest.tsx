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
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-20",
            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "bg-primary text-primary-foreground shadow-rose",
            "text-xs font-medium",
            "hover:brightness-110 active:scale-95 transition-all",
            className,
          )}
          aria-label={count > 0 ? `${count} নতুন মেসেজ — নিচে যান` : "সর্বশেষে যান"}
        >
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
              {count}
            </span>
          )}
          <span>{count > 0 ? "নতুন মেসেজ" : "নিচে যান"}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
