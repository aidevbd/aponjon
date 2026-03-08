import { Heart, UserPlus, Download, MessageCircle, Activity, Cake } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";

interface DashboardHomeProps {
  stats: { total: number; categoryCount: Record<string, number> };
  totalUnread: number;
  upcomingBirthdays: { contact: ContactRow; daysUntil: number }[];
  onCategoryClick: (cat: string) => void;
  onAddContact: () => void;
  onExportCSV: () => void;
  onOpenChat: () => void;
  onOpenLogs: () => void;
}

export function DashboardHome({
  stats, totalUnread, upcomingBirthdays,
  onCategoryClick, onAddContact, onExportCSV, onOpenChat, onOpenLogs,
}: DashboardHomeProps) {
  return (
    <div className="space-y-4">
      {/* Welcome + Quick Stats */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl hero-gradient shadow-rose">
          <Heart className="h-6 w-6 text-primary-foreground fill-current" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-display font-bold text-foreground">আপনজন ড্যাশবোর্ড</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            মোট <span className="font-semibold text-primary">{stats.total}</span> জন কন্টাক্ট
            {totalUnread > 0 && <> · <span className="font-semibold text-primary">{totalUnread}</span> অপঠিত মেসেজ</>}
            {upcomingBirthdays.length > 0 && <> · <span className="font-semibold text-primary">{upcomingBirthdays.length}</span> আসন্ন জন্মদিন</>}
          </p>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats.categoryCount).map(([cat, count]) => {
          const catInfo = CATEGORIES.find((c) => c.value === cat);
          return (
            <button
              key={cat}
              onClick={() => onCategoryClick(cat)}
              className="flex items-center gap-1.5 rounded-full bg-card border border-border/50 px-3 py-1.5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <span className="text-sm">{catInfo?.icon || "✨"}</span>
              <span className="text-xs font-medium text-foreground">{cat}</span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 min-w-[20px] text-center">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div className="glass-card p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
            <Cake className="h-3.5 w-3.5 text-primary" /> আসন্ন জন্মদিন
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {upcomingBirthdays.slice(0, 6).map(({ contact, daysUntil }) => (
              <div key={contact.id} className="flex items-center gap-1.5 rounded-full bg-primary/5 border border-primary/10 px-2.5 py-1">
                <span className="text-xs">{daysUntil === 0 ? "🎉" : "🎂"}</span>
                <span className="text-xs font-medium text-foreground">{contact.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {daysUntil === 0 ? "আজ!" : `${daysUntil}দিন`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onAddContact} className="glass-card p-3 flex items-center gap-2.5 hover:border-primary/30 transition-colors text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">কন্টাক্ট যোগ</div>
            <div className="text-[10px] text-muted-foreground">নতুন প্রিয়জন</div>
          </div>
        </button>
        <button onClick={onExportCSV} className="glass-card p-3 flex items-center gap-2.5 hover:border-primary/30 transition-colors text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Download className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">CSV ডাউনলোড</div>
            <div className="text-[10px] text-muted-foreground">ব্যাকআপ নিন</div>
          </div>
        </button>
        <button onClick={onOpenChat} className="glass-card p-3 flex items-center gap-2.5 hover:border-primary/30 transition-colors text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 relative">
            <MessageCircle className="h-4 w-4 text-primary" />
            {totalUnread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full hero-gradient text-[9px] font-bold text-primary-foreground px-1">{totalUnread}</span>}
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">চ্যাট</div>
            <div className="text-[10px] text-muted-foreground">মেসেজ দেখুন</div>
          </div>
        </button>
        <button onClick={onOpenLogs} className="glass-card p-3 flex items-center gap-2.5 hover:border-primary/30 transition-colors text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Activity className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">অ্যাক্টিভিটি</div>
            <div className="text-[10px] text-muted-foreground">লগ দেখুন</div>
          </div>
        </button>
      </div>
    </div>
  );
}
