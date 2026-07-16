import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const activeCount =
    (filterCategory !== "all" ? 1 : 0) + (filterBloodGroup !== "all" ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Compact top row: search + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--heirloom-ink-mute))]" />
          <input
            type="text"
            placeholder="নাম, নম্বর, কি-ওয়ার্ড..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="heirloom-input w-full rounded-sm border pl-9 pr-8 py-2 text-[13px] outline-none"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="সার্চ ক্লিয়ার"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[hsl(var(--heirloom-ink-mute))] hover:text-[hsl(var(--heirloom-ink))]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`relative flex items-center gap-1.5 rounded-sm border px-3 py-2 text-[12px] transition-colors ${
            open || activeCount > 0
              ? "border-[hsl(var(--heirloom-gold)/0.6)] bg-[hsl(var(--heirloom-gold)/0.1)] text-[hsl(var(--heirloom-gold-deep))]"
              : "border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ফিল্টার</span>
          {activeCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold-deep))] text-[hsl(var(--heirloom-paper))] text-[10px] px-1">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded filters */}
      {open && (
        <div className="space-y-3 pt-1">
          {/* Category */}
          <div className="space-y-1.5">
            <div className="text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--heirloom-ink-mute))]">
              ক্যাটাগরি
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={filterCategory === "all"} onClick={() => onCategoryChange("all")}>
                সব
              </FilterChip>
              {CATEGORIES.map((cat) => {
                const count = categoryCount[cat.value] || 0;
                if (count === 0) return null;
                const active = filterCategory === cat.value;
                return (
                  <FilterChip
                    key={cat.value}
                    active={active}
                    onClick={() => onCategoryChange(active ? "all" : cat.value)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.value}</span>
                    <span className={active ? "text-[hsl(var(--heirloom-gold-deep))]" : "text-[hsl(var(--heirloom-ink-mute))]"}>
                      {count}
                    </span>
                  </FilterChip>
                );
              })}
            </div>
          </div>

          {/* Blood group */}
          <div className="space-y-1.5">
            <div className="text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--heirloom-ink-mute))]">
              রক্তের গ্রুপ
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={filterBloodGroup === "all"} onClick={() => onBloodGroupChange("all")}>
                সব
              </FilterChip>
              {BLOOD_GROUPS.map((bg) => {
                const active = filterBloodGroup === bg;
                return (
                  <FilterChip
                    key={bg}
                    active={active}
                    onClick={() => onBloodGroupChange(active ? "all" : bg)}
                  >
                    {bg}
                  </FilterChip>
                );
              })}
            </div>
          </div>

          {activeCount > 0 && (
            <button
              onClick={() => { onCategoryChange("all"); onBloodGroupChange("all"); }}
              className="text-[11px] text-[hsl(var(--heirloom-gold-deep))] underline-offset-4 hover:underline"
            >
              সব ফিল্টার রিসেট
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-200 ${
        active
          ? "bg-[hsl(var(--heirloom-gold)/0.15)] text-[hsl(var(--heirloom-gold-deep))] border-[hsl(var(--heirloom-gold)/0.6)]"
          : "bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] border-[hsl(var(--heirloom-line))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
      }`}
    >
      {children}
    </button>
  );
}
