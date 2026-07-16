import { UserPlus, Download, MessageCircle, Activity, Cake } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { CategoryIcon } from "@/lib/categoryIcons";
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
  const actions = [
    { label: "কন্টাক্ট যোগ", hint: "নতুন প্রিয়জন", icon: UserPlus, onClick: onAddContact, badge: 0 },
    { label: "CSV ডাউনলোড", hint: "ব্যাকআপ নিন", icon: Download, onClick: onExportCSV, badge: 0 },
    { label: "চ্যাট", hint: "মেসেজ দেখুন", icon: MessageCircle, onClick: onOpenChat, badge: totalUnread },
    { label: "অ্যাক্টিভিটি", hint: "লগ দেখুন", icon: Activity, onClick: onOpenLogs, badge: 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Welcome header */}
      <div className="flex flex-col items-center text-center pt-4 sm:pt-8">
        <h2 className="font-display text-3xl leading-[1.15] tracking-tight text-[hsl(var(--heirloom-ink))] sm:text-4xl">
          আপনজন ড্যাশবোর্ড
        </h2>

        <div aria-hidden className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

        <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))] sm:text-base">
          মোট <span className="font-medium text-[hsl(var(--heirloom-gold-deep))]">{stats.total}</span> জন কন্টাক্ট
          {totalUnread > 0 && <> · <span className="font-medium text-[hsl(var(--heirloom-gold-deep))]">{totalUnread}</span> অপঠিত মেসেজ</>}
          {upcomingBirthdays.length > 0 && <> · <span className="font-medium text-[hsl(var(--heirloom-gold-deep))]">{upcomingBirthdays.length}</span> আসন্ন জন্মদিন</>}
        </p>
      </div>

      {/* Category pills */}
      {Object.keys(stats.categoryCount).length > 0 && (
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {Object.entries(stats.categoryCount).map(([cat, count]) => {
            const catInfo = CATEGORIES.find((c) => c.value === cat);
            return (
              <button
                key={cat}
                onClick={() => onCategoryClick(cat)}
                className="group flex items-center gap-1.5 rounded-full border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.6)] px-3.5 py-1.5 transition-all duration-300 hover:border-[hsl(var(--heirloom-gold)/0.6)] hover:bg-[hsl(var(--heirloom-cream)/0.5)]"
              >
                <span className="text-sm">{catInfo?.icon || "✨"}</span>
                <span className="text-[13px] text-[hsl(var(--heirloom-ink))]">{cat}</span>
                <span className="text-[11px] text-[hsl(var(--heirloom-ink-soft))]">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Upcoming birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-center gap-2 text-[hsl(var(--heirloom-ink-soft))]">
            <Cake className="h-4 w-4 text-[hsl(var(--heirloom-gold-deep))]" />
            <span className="text-[13px] tracking-wide uppercase">আসন্ন জন্মদিন</span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {upcomingBirthdays.slice(0, 8).map(({ contact, daysUntil }) => (
              <div
                key={contact.id}
                className="flex items-center gap-2 rounded-full border border-[hsl(var(--heirloom-gold)/0.3)] bg-[hsl(var(--heirloom-cream)/0.4)] px-3 py-1.5"
              >
                <span className="text-sm">{daysUntil === 0 ? "🎉" : "🎂"}</span>
                <span className="text-[13px] text-[hsl(var(--heirloom-ink))]">{contact.name}</span>
                <span className="text-[11px] text-[hsl(var(--heirloom-ink-soft))]">
                  {daysUntil === 0 ? "আজ" : `${daysUntil} দিন`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mx-auto mt-10 grid w-full max-w-[440px] grid-cols-1 gap-3 sm:mt-12 sm:max-w-none sm:grid-cols-2">
        {actions.map(({ label, hint, icon: Icon, onClick, badge }) => (
          <button
            key={label}
            onClick={onClick}
            className="group relative flex items-center gap-3 rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.55)] px-4 py-3.5 text-left transition-all duration-300 hover:border-[hsl(var(--heirloom-gold)/0.6)] hover:bg-[hsl(var(--heirloom-cream)/0.5)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.08)]">
              <Icon className="h-4 w-4 text-[hsl(var(--heirloom-gold-deep))]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] text-[hsl(var(--heirloom-ink))]">{label}</div>
              <div className="text-[12px] text-[hsl(var(--heirloom-ink-soft))]">{hint}</div>
            </div>
            {badge > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold-deep))] px-1.5 text-[10px] font-medium text-[hsl(var(--heirloom-paper))]">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
