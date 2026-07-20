import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "ছবি", onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [src, onClose]);

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="ছবির বড় প্রিভিউ"
        >
          {/* Top bar */}
          <div
            className={cn(
              "absolute top-0 inset-x-0 flex items-center justify-end gap-2 p-3",
              "pt-[max(0.75rem,env(safe-area-inset-top))]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              title="নতুন ট্যাবে খুলুন"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={src}
              download
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              title="ডাউনলোড"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              title="বন্ধ করুন"
              aria-label="বন্ধ করুন"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <motion.img
            key={src}
            src={src}
            alt={alt}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
