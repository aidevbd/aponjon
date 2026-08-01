import { MessageCircle } from "lucide-react";
import { formatPresenceLabel } from "@/lib/chatFormatters";
import type { AdminChatUser, PresenceMap } from "@/components/admin/adminChatTypes";

interface Props {
  users: AdminChatUser[];
  presenceMap: PresenceMap;
  unreadMap: Record<string, number>;
  selectedUserId?: string | null;
  onSelect: (user: AdminChatUser) => void;
}

export function AdminChatUserList({ users, presenceMap, unreadMap, selectedUserId, onSelect }: Props) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">এখনো কেউ মেসেজ করেনি</p>
        <p className="text-xs mt-1">ইউজাররা চ্যাট পেজ থেকে আপনাকে মেসেজ করতে পারবে</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-1">
      {users.map((u) => {
        const presence = presenceMap[u.id];
        const lastSeenText = formatPresenceLabel(presence);
        const isActive = selectedUserId === u.id;
        return (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            className={`w-full flex items-center gap-3 rounded-xl p-3 text-left border transition-colors ${
              isActive
                ? "bg-heirloom-cream/[0.6] border-heirloom-gold/[0.5]"
                : "border-transparent hover:bg-card/80 hover:border-border/50"
            }`}
          >
            <div className="relative shrink-0">
              {u.photo_url ? (
                <img src={u.photo_url} alt={u.name} className="h-10 w-10 rounded-full object-cover border border-primary/20" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{u.name.charAt(0)}</div>
              )}
              {presence?.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-sm truncate">{u.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {lastSeenText ? (
                  <span className={presence?.isOnline ? "text-emerald-600" : ""}>{lastSeenText}</span>
                ) : u.phone}
              </div>
            </div>
            {!!unreadMap[u.id] && (
              <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-micro font-bold px-1.5">
                {unreadMap[u.id]}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
