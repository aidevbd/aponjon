import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, X, Check } from "lucide-react";
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

  const activeCategory = CATEGORIES.find((c) => c.value === filterCategory);

  return (
    <div className="space-y-2">
      {/* Row: search + filter toggle */}
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

      {/* Expanded: dropdowns */}
      {open && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <FilterDropdown
            label="ক্যাটাগরি"
            active={filterCategory !== "all"}
            activeLabel={activeCategory ? `${activeCategory.icon} ${activeCategory.value}` : undefined}
            onClear={() => onCategoryChange("all")}
          >
            {(close) => (
              <div className="max-h-64 overflow-y-auto py-1">
                <DropdownItem
                  selected={filterCategory === "all"}
                  onClick={() => { onCategoryChange("all"); close(); }}
                >
                  সব ক্যাটাগরি
                </DropdownItem>
                {CATEGORIES.map((cat) => {
                  const count = categoryCount[cat.value] || 0;
                  if (count === 0) return null;
                  return (
                    <DropdownItem
                      key={cat.value}
                      selected={filterCategory === cat.value}
                      onClick={() => { onCategoryChange(cat.value); close(); }}
                    >
                      <span className="flex-1 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.value}</span>
                      </span>
                      <span className="text-[10px] text-[hsl(var(--heirloom-ink-mute))]">
                        {count}
                      </span>
                    </DropdownItem>
                  );
                })}
              </div>
            )}
          </FilterDropdown>

          <FilterDropdown
            label="রক্ত"
            active={filterBloodGroup !== "all"}
            activeLabel={filterBloodGroup !== "all" ? filterBloodGroup : undefined}
            onClear={() => onBloodGroupChange("all")}
          >
            {(close) => (
              <div className="py-1">
                <DropdownItem
                  selected={filterBloodGroup === "all"}
                  onClick={() => { onBloodGroupChange("all"); close(); }}
                >
                  সব গ্রুপ
                </DropdownItem>
                <div className="grid grid-cols-4 gap-1 p-1.5">
                  {BLOOD_GROUPS.map((bg) => {
                    const active = filterBloodGroup === bg;
                    return (
                      <button
                        key={bg}
                        onClick={() => { onBloodGroupChange(active ? "all" : bg); close(); }}
                        className={`rounded-sm border px-1.5 py-1.5 text-[11px] transition-colors ${
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
            )}
          </FilterDropdown>

          {activeCount > 0 && (
            <button
              onClick={() => { onCategoryChange("all"); onBloodGroupChange("all"); }}
              className="text-[11px] text-[hsl(var(--heirloom-gold-deep))] underline-offset-4 hover:underline"
            >
              রিসেট
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  active,
  activeLabel,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  activeLabel?: string;
  onClear: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12px] transition-colors ${
          active
            ? "border-[hsl(var(--heirloom-gold)/0.6)] bg-[hsl(var(--heirloom-gold)/0.1)] text-[hsl(var(--heirloom-gold-deep))]"
            : "border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
        }`}
      >
        <span className="max-w-[140px] truncate">{activeLabel || label}</span>
        {active ? (
          <span
            role="button"
            aria-label="ক্লিয়ার"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[hsl(var(--heirloom-gold-deep))] hover:bg-[hsl(var(--heirloom-gold)/0.2)]"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 min-w-[200px] rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper))] shadow-[0_12px_32px_-12px_hsl(var(--heirloom-ink)/0.25)]">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
        selected
          ? "bg-[hsl(var(--heirloom-gold)/0.12)] text-[hsl(var(--heirloom-gold-deep))]"
          : "text-[hsl(var(--heirloom-ink-soft))] hover:bg-[hsl(var(--heirloom-gold)/0.06)]"
      }`}
    >
      {children}
      {selected && <Check className="h-3 w-3 text-[hsl(var(--heirloom-gold-deep))]" />}
    </button>
  );
}
