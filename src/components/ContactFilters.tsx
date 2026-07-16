import { Search, X } from "lucide-react";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";

interface ContactFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  filterCategory: string;
  onCategoryChange: (val: string) => void;
  filterBloodGroup: string;
  onBloodGroupChange: (val: string) => void;
  categoryCount: Record<string, number>;
}

export function ContactFilters({
  search, onSearchChange,
  filterCategory, onCategoryChange,
  filterBloodGroup, onBloodGroupChange,
  categoryCount,
}: ContactFiltersProps) {
  const activeCatCount = Object.entries(categoryCount).filter(([, n]) => n > 0).length;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--heirloom-ink-mute))]" />
        <input
          type="text"
          placeholder="নাম, নম্বর বা কি-ওয়ার্ড..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="heirloom-input w-full rounded-sm border pl-10 pr-9 py-2.5 text-[14px] outline-none"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="সার্চ ক্লিয়ার"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[hsl(var(--heirloom-ink-mute))] hover:text-[hsl(var(--heirloom-ink))] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category pills */}
      {activeCatCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onCategoryChange("all")}
            className={`rounded-full px-3 py-1.5 text-[12px] transition-all duration-200 border ${
              filterCategory === "all"
                ? "bg-[hsl(var(--heirloom-gold)/0.15)] text-[hsl(var(--heirloom-gold-deep))] border-[hsl(var(--heirloom-gold)/0.6)]"
                : "bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] border-[hsl(var(--heirloom-line))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
            }`}
          >
            সব
          </button>
          {CATEGORIES.map((cat) => {
            const count = categoryCount[cat.value] || 0;
            if (count === 0) return null;
            const active = filterCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => onCategoryChange(active ? "all" : cat.value)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all duration-200 border ${
                  active
                    ? "bg-[hsl(var(--heirloom-gold)/0.15)] text-[hsl(var(--heirloom-gold-deep))] border-[hsl(var(--heirloom-gold)/0.6)]"
                    : "bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] border-[hsl(var(--heirloom-line))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.value}</span>
                <span className={`text-[10px] ${active ? "text-[hsl(var(--heirloom-gold-deep))]" : "text-[hsl(var(--heirloom-ink-mute))]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Blood group */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] tracking-wide uppercase text-[hsl(var(--heirloom-ink-mute))] mr-1">
          রক্তের গ্রুপ
        </span>
        <button
          onClick={() => onBloodGroupChange("all")}
          className={`rounded-full px-2.5 py-1 text-[11px] transition-all duration-200 border ${
            filterBloodGroup === "all"
              ? "bg-[hsl(var(--heirloom-gold)/0.15)] text-[hsl(var(--heirloom-gold-deep))] border-[hsl(var(--heirloom-gold)/0.6)]"
              : "bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] border-[hsl(var(--heirloom-line))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
          }`}
        >
          সব
        </button>
        {BLOOD_GROUPS.map((bg) => {
          const active = filterBloodGroup === bg;
          return (
            <button
              key={bg}
              onClick={() => onBloodGroupChange(active ? "all" : bg)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-all duration-200 border ${
                active
                  ? "bg-[hsl(var(--heirloom-gold)/0.15)] text-[hsl(var(--heirloom-gold-deep))] border-[hsl(var(--heirloom-gold)/0.6)]"
                  : "bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] border-[hsl(var(--heirloom-line))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
              }`}
            >
              {bg}
            </button>
          );
        })}
      </div>
    </div>
  );
}
