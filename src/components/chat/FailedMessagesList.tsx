import { AlertCircle, RotateCcw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FailedChatMessage = {
  id: string;
  content: string | null;
  imageUrl?: string | null;
  replyToId?: string | null;
  replyContent?: string | null;
  createdAt: string;
  retrying?: boolean;
};

interface Props {
  items: FailedChatMessage[];
  onResend: (id: string) => void;
  onDelete: (id: string) => void;
}

export function FailedMessagesList({ items, onResend, onDelete }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="px-4 pt-1.5 space-y-1.5">
      {items.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-[11px] text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">পাঠানো যায়নি</div>
            <div className="truncate text-foreground/80">
              {f.content || (f.imageUrl ? "📷 ছবি" : "মেসেজ")}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary"
            onClick={() => onResend(f.id)}
            disabled={f.retrying}
            aria-label="আবার পাঠান"
          >
            {f.retrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            আবার পাঠান
          </Button>
          <button
            onClick={() => onDelete(f.id)}
            className="text-muted-foreground hover:text-destructive shrink-0"
            aria-label="বাদ দিন"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
