import { Pin } from "lucide-react";

type PinnedItem = { id: string; content: string | null };

interface PinnedMessagesBarProps {
  items: PinnedItem[];
}

export const PinnedMessagesBar = ({ items }: PinnedMessagesBarProps) => {
  if (items.length === 0) return null;

  return (
    <div className="px-4 pt-2 shrink-0">
      <div className="bg-accent/50 rounded-lg p-2 border border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Pin className="h-3 w-3" aria-hidden="true" /> পিন করা মেসেজ
        </div>
        {items.slice(0, 2).map((pm) => (
          <p key={pm.id} className="text-xs text-foreground truncate">
            📌 {pm.content || "ছবি"}
          </p>
        ))}
      </div>
    </div>
  );
};
