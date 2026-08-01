import { Heart, MessageCircle } from "lucide-react";

interface Props {
  hidden: boolean;
  totalContacts: number;
  totalUnread: number;
  upcomingBirthdayCount: number;
  showChatShortcut: boolean;
  onOpenChat: () => void;
}

export function AdminHeader({
  hidden,
  totalContacts,
  totalUnread,
  upcomingBirthdayCount,
  showChatShortcut,
  onOpenChat,
}: Props) {
  return (
    <header className={`sticky top-0 z-50 shrink-0 border-b border-heirloom-line bg-heirloom-paper/[0.85] backdrop-blur ${hidden ? "hidden" : ""}`}>
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-heirloom-gold/[0.5] bg-heirloom-gold/[0.08]">
            <Heart className="h-3.5 w-3.5 text-heirloom-gold-deep fill-current" />
          </div>
          <span className="font-display text-[17px] tracking-tight text-heirloom-ink">আপনজন</span>
          <span className="hidden sm:inline text-micro tracking-[0.15em] uppercase text-heirloom-gold-deep border-l border-heirloom-line pl-2.5 ml-0.5">
            অ্যাডমিন
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[12px] text-heirloom-ink-soft">
            <span>{totalContacts} কন্টাক্ট</span>
            {totalUnread > 0 && (
              <>
                <span aria-hidden className="h-3 w-px bg-heirloom-line" />
                <span className="text-heirloom-gold-deep">{totalUnread} অপঠিত</span>
              </>
            )}
            {upcomingBirthdayCount > 0 && (
              <>
                <span aria-hidden className="h-3 w-px bg-heirloom-line" />
                <span>{upcomingBirthdayCount} আসন্ন জন্মদিন</span>
              </>
            )}
          </div>
          {showChatShortcut && (
            <button
              type="button"
              onClick={onOpenChat}
              aria-label={totalUnread > 0 ? `চ্যাট — ${totalUnread}টি অপঠিত` : "চ্যাট খুলুন"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-heirloom-ink hover:bg-heirloom-cream/[0.6] active:scale-95 transition-transform duration-150 touch-manipulation"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <MessageCircle className="h-5 w-5" />
              {totalUnread > 0 && (
                <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-heirloom-gold px-1 text-micro font-semibold text-heirloom-ink shadow">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
