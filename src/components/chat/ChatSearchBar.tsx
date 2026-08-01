import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  resultCount: number;
}

/** থ্রেডের ভেতরে মেসেজ খোঁজার সরু বার। */
export const ChatSearchBar = ({ query, onQueryChange, onClose, resultCount }: ChatSearchBarProps) => (
  <div className="relative z-40 isolate shrink-0 px-4 pt-2 pb-2 bg-background">
    <div className="flex items-center gap-2">
      <Input
        placeholder="মেসেজ খুঁজুন..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="bg-card h-8 text-sm"
        autoFocus
        aria-label="মেসেজে খুঁজুন"
      />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="সার্চ বন্ধ করুন" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
    {query && (
      <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
        {resultCount} টি মেসেজ পাওয়া গেছে
      </p>
    )}
  </div>
);
