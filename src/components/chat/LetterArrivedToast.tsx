import { Mail } from "lucide-react";
import { toast } from "sonner";

interface Props {
  toastId: string | number;
  count: number;
  onOpen: () => void;
}

/**
 * Heirloom-styled "চিঠি এসেছে" toast — replaces the generic Sonner message
 * style for incoming chat notifications. Rose + gold envelope card with
 * serif heading, warm auto-dismiss, and a soft open animation.
 */
export function LetterArrivedToast({ toastId, count, onOpen }: Props) {
  const title = count > 1 ? `${count}টি নতুন চিঠি` : "একটি চিঠি এসেছে";
  const subtitle = count > 1 ? "চ্যাটে খুলে দেখুন" : "কেউ আপনাকে কিছু লিখেছেন";

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-[340px] max-w-[92vw] items-center gap-3 rounded-full border border-heirloom-gold/[0.4] bg-card/95 py-2 pl-2 pr-2.5 shadow-heirloom-toast backdrop-blur-sm animate-fade-in"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-heirloom-gold/[0.15] ring-1 ring-heirloom-gold/[0.35]">
        <Mail className="h-4 w-4 text-heirloom-gold" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[14px] leading-tight text-foreground truncate">
          {title}
        </div>
        <div className="text-[11.5px] leading-snug text-muted-foreground truncate">
          {subtitle}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          onOpen();
          toast.dismiss(toastId);
        }}
        className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
      >
        পড়ি
      </button>
    </div>
  );
}
