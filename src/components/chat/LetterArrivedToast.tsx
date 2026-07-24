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
      className="pointer-events-auto w-[320px] max-w-[92vw] overflow-hidden rounded-2xl border border-[hsl(var(--heirloom-gold)/0.35)] bg-gradient-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--rose-soft)/0.55)] shadow-[0_10px_30px_-12px_hsl(var(--heirloom-ink)/0.35)] backdrop-blur-sm animate-fade-in"
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--heirloom-gold)/0.25)] to-[hsl(var(--primary)/0.18)] ring-1 ring-[hsl(var(--heirloom-gold)/0.4)]">
          <Mail className="h-5 w-5 text-[hsl(var(--heirloom-gold))]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] leading-tight text-foreground">
            {title}
          </div>
          <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {subtitle}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onOpen();
            toast.dismiss(toastId);
          }}
          className="shrink-0 rounded-full bg-primary/95 px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary hover:shadow-md active:scale-95"
        >
          পড়ি
        </button>
      </div>
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold)/0.55)] to-transparent" />
    </div>
  );
}
