import { MessageCircle } from "lucide-react";
import { formatTime, formatLastSeen } from "@/lib/chatFormatters";

type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };
type ContactPreview = { preview: string; time: string | null };
type Presence = { is_online: boolean; last_seen_at: string };

type Props = {
  contacts: ChatContact[];
  selectedId?: string | null;
  unreadMap: Record<string, number>;
  presenceMap: Record<string, Presence>;
  contactPreviews: Record<string, ContactPreview>;
  onSelect: (contact: ChatContact) => void;
};

export function ChatContactList({
  contacts,
  selectedId,
  unreadMap,
  presenceMap,
  contactPreviews,
  onSelect,
}: Props) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground px-4">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-sm">এখনো কথা শুরু হয়নি</p>
        <p className="text-xs mt-1">শীঘ্রই এখান থেকে আপনজনের সাথে মনের কথা ভাগ করা যাবে</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 py-3">
      {contacts.map((c) => {
        const isActive = selectedId === c.id;
        const online = presenceMap[c.id]?.is_online;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors border ${
              isActive
                ? "bg-card border-primary/40 shadow-rose/40"
                : "border-transparent hover:bg-card/80 hover:border-border/50"
            }`}
          >
            <div className="relative shrink-0">
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt={c.name}
                  className="h-11 w-11 rounded-full object-cover border border-primary/20"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {c.name.charAt(0)}
                </div>
              )}
              {online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-medium text-foreground text-sm truncate">
                  {c.name}{" "}
                  <span className="text-xs love-badge ml-1">আপনার আপনজন</span>
                </div>
                {contactPreviews[c.id]?.time && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(contactPreviews[c.id].time!)}
                  </span>
                )}
              </div>
              <div
                className={`text-xs truncate ${
                  online ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                }`}
              >
                {contactPreviews[c.id]?.preview ||
                  formatLastSeen(presenceMap[c.id]) ||
                  "ট্যাপ করে মেসেজ করুন"}
              </div>
            </div>
            {unreadMap[c.id] > 0 && (
              <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-xs font-bold px-1.5">
                {unreadMap[c.id]}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
