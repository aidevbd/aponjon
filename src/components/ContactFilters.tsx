import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
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
  const [draftCat, setDraftCat] = useState(filterCategory);
  const [draftBg, setDraftBg] = useState(filterBloodGroup);

  const activeCount =
    (filterCategory !== "all" ? 1 : 0) + (filterBloodGroup !== "all" ? 1 : 0);

  useEffect(() => {
    if (open) {
      setDraftCat(filterCategory);
      setDraftBg(filterBloodGroup);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, filterCategory, filterBloodGroup]);

  const apply = () => {
    onCategoryChange(draftCat);
    onBloodGroupChange(draftBg);
    setOpen(false);
  };

  const reset = () => {
    setDraftCat("all");
    setDraftBg("all");
  };

  return (
    <>
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
          onClick={() => setOpen(true)}
          className={`relative flex items-center gap-1.5 rounded-sm border px-3 py-2 text-[12px] transition-colors ${
            activeCount > 0
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

      {open && createPortal(
        <FilterModal
          onClose={() => setOpen(false)}
          draftCat={draftCat}
          setDraftCat={setDraftCat}
          draftBg={draftBg}
          setDraftBg={setDraftBg}
          categoryCount={categoryCount}
          onApply={apply}
          onReset={reset}
        />,
        document.body
      )}
    </>
  );
}

function FilterModal({
  onClose,
  draftCat,
  setDraftCat,
  draftBg,
  setDraftBg,
  categoryCount,
  onApply,
  onReset,
}: {
  onClose: () => void;
  draftCat: string;
  setDraftCat: (v: string) => void;
  draftBg: string;
  setDraftBg: (v: string) => void;
  categoryCount: Record<string, number>;
  onApply: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-in fade-in duration-200">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[hsl(var(--heirloom-ink)/0.35)] backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-md sm:mx-4 max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-lg border border-[hsl(var(--heirloom-gold)/0.35)] bg-[hsl(var(--heirloom-paper))] shadow-[0_-12px_40px_-12px_hsl(var(--heirloom-ink)/0.3)] sm:shadow-[0_20px_50px_-15px_hsl(var(--heirloom-ink)/0.3)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[hsl(var(--heirloom-line))]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--heirloom-ink-mute))]">
              ছাঁকনি
            </div>
            <h3 className="font-display text-lg text-[hsl(var(--heirloom-ink))]">
              ফিল্টার
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="বন্ধ"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--heirloom-ink-soft))] hover:bg-[hsl(var(--heirloom-gold)/0.1)] hover:text-[hsl(var(--heirloom-ink))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Gold divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold)/0.5)] to-transparent" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Category */}
          <section className="space-y-2">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--heirloom-ink-mute))]">
              ক্যাটাগরি
            </div>
            <div className="rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.5)] overflow-hidden">
              <OptionRow
                selected={draftCat === "all"}
                onClick={() => setDraftCat("all")}
                label="সব ক্যাটাগরি"
              />
              {CATEGORIES.map((cat) => {
                const count = categoryCount[cat.value] || 0;
                if (count === 0) return null;
                return (
                  <OptionRow
                    key={cat.value}
                    selected={draftCat === cat.value}
                    onClick={() => setDraftCat(cat.value)}
                    label={
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.value}</span>
                      </span>
                    }
                    trailing={
                      <span className="text-[10px] text-[hsl(var(--heirloom-ink-mute))]">
                        {count}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </section>

          {/* Blood group */}
          <section className="space-y-2">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--heirloom-ink-mute))]">
              রক্তের গ্রুপ
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <BgChip active={draftBg === "all"} onClick={() => setDraftBg("all")}>
                সব
              </BgChip>
              {BLOOD_GROUPS.map((bg) => (
                <BgChip
                  key={bg}
                  active={draftBg === bg}
                  onClick={() => setDraftBg(bg)}
                >
                  {bg}
                </BgChip>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper))] px-5 py-3">
          <button
            onClick={onReset}
            className="text-[12px] text-[hsl(var(--heirloom-ink-soft))] underline-offset-4 hover:underline hover:text-[hsl(var(--heirloom-gold-deep))]"
          >
            রিসেট
          </button>
          <div className="flex-1" />
          <button
            onClick={onApply}
            className="heirloom-btn-primary rounded-sm px-5 py-2 text-[13px] tracking-wide"
          >
            প্রয়োগ কর
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  selected,
  onClick,
  label,
  trailing,
}: {
  selected: boolean;
  onClick: () => void;
  label: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 border-b border-[hsl(var(--heirloom-line))] last:border-b-0 px-3 py-2.5 text-left text-[13px] transition-colors ${
        selected
          ? "bg-[hsl(var(--heirloom-gold)/0.12)] text-[hsl(var(--heirloom-gold-deep))]"
          : "text-[hsl(var(--heirloom-ink))] hover:bg-[hsl(var(--heirloom-gold)/0.06)]"
      }`}
    >
      <span className="flex-1">{label}</span>
      {trailing}
      {selected && <Check className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))]" />}
    </button>
  );
}

function BgChip({
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
      className={`rounded-sm border py-2 text-[12px] transition-colors ${
        active
          ? "bg-[hsl(var(--heirloom-gold)/0.15)] text-[hsl(var(--heirloom-gold-deep))] border-[hsl(var(--heirloom-gold)/0.6)]"
          : "bg-[hsl(var(--heirloom-paper)/0.6)] text-[hsl(var(--heirloom-ink-soft))] border-[hsl(var(--heirloom-line))] hover:border-[hsl(var(--heirloom-gold)/0.4)]"
      }`}
    >
      {children}
    </button>
  );
}
