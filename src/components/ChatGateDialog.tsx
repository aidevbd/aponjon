import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, PlusCircle, Search, X } from "lucide-react";
import { useEffect } from "react";

interface ChatGateDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Heirloom-styled gate dialog shown when a visitor without a chat session
 * taps the messenger icon. Guides them to /access (existing user) or
 * /add (new user) in আপনজন's warm, personal tone.
 */
export function ChatGateDialog({ open, onClose }: ChatGateDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(var(--heirloom-ink))]/40 backdrop-blur-sm px-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-gate-title"
        >
          <motion.div
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="heirloom-dialog relative w-full max-w-[22.5rem] rounded-sm border p-5 shadow-xl sm:max-w-md sm:p-8"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-sm bg-[hsl(var(--heirloom-paper))]" />

            {/* Corner ornaments */}
            <div aria-hidden className="heirloom-corner pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner pointer-events-none absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 rounded-br-sm" />

            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--heirloom-ink-soft))] hover:bg-[hsl(var(--heirloom-line))]/40 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold))]/15 text-[hsl(var(--heirloom-gold))]">
                <MessageCircle className="h-6 w-6" />
              </div>

              <h2
                id="chat-gate-title"
                className="mt-4 font-display text-[1.45rem] leading-tight text-[hsl(var(--heirloom-ink))] sm:text-[26px]"
              >
                একটু কথা বলবেন?
              </h2>

              <div aria-hidden className="mt-4 h-px w-20 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

              <p className="mt-4 max-w-sm text-[14.5px] leading-[1.75] text-[hsl(var(--heirloom-ink-soft))] sm:text-[15px]">
                আপনজনদের সাথে সরাসরি মন খুলে কথা বলতে চাইলে আগে একটু পরিচয় দিতে হবে —
                আপনার নাম-নম্বরটা আমাদের খাতায় আছে কি না দেখে নিই। তারপরই আমরা গল্প শুরু করতে পারব।
              </p>

              <div className="mx-auto mt-6 flex w-full max-w-[360px] flex-col gap-3">
                <Link
                  to="/verify?next=chat"
                  onClick={onClose}
                  className="heirloom-btn-primary group flex w-full items-center justify-center gap-2 rounded-sm px-5 py-3.5 text-[14.5px] font-medium transition-all duration-300"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  <span>আগে যোগ করেছি — যাচাই করি</span>
                </Link>

                <Link
                  to="/add"
                  onClick={onClose}
                  className="heirloom-btn-ghost group flex w-full items-center justify-center gap-2 rounded-sm border px-5 py-3 text-[14px] font-medium transition-all duration-300"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden />
                  <span>নতুন আপনজন — তথ্য যোগ করি</span>
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="mt-1 text-[13px] italic text-[hsl(var(--heirloom-ink-soft))] hover:text-[hsl(var(--heirloom-ink))] transition"
                >
                  পরে করব
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
