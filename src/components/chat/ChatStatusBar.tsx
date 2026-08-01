import { Loader2, WifiOff, Clock3 } from "lucide-react";

interface ChatStatusBarProps {
  sending: boolean;
  isOffline: boolean;
  queuedCount: number;
}

export const ChatStatusBar = ({ sending, isOffline, queuedCount }: ChatStatusBarProps) => {
  if (!sending && !isOffline && queuedCount === 0) return null;

  const tone = sending
    ? "text-primary"
    : isOffline
      ? "text-destructive"
      : queuedCount > 0
        ? "text-foreground"
        : "text-muted-foreground";

  const label = sending
    ? "মেসেজ পাঠানো হচ্ছে..."
    : isOffline
      ? "নেটওয়ার্ক নেই — মেসেজটা অপেক্ষায় থাকবে"
      : queuedCount > 0
        ? `${queuedCount}টি মেসেজ অপেক্ষায় আছে`
        : "অনলাইন — এখনই মেসেজ যাবে";

  return (
    <div className="px-4 pt-1.5">
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/60 px-3 py-1.5 text-xs ${tone}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 min-w-0">
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
          ) : isOffline ? (
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{label}</span>
        </div>
        {queuedCount > 0 && (
          <span className="rounded-full bg-card px-2 py-0.5 text-foreground shrink-0">
            {queuedCount}টি অপেক্ষায়
          </span>
        )}
      </div>
    </div>
  );
};
