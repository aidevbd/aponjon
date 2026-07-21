import { useMemo } from "react";
import { ContactListItem } from "@/components/ContactListItem";
import type { ContactRow } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";
import { getSectionKey, sectionSortIndex } from "@/lib/banglaSearch";

interface Props {
  contacts: ContactRow[];
  query: string;
  highlightedId?: string | null;
  onClick: (c: ContactRow) => void;
  groupBy: "az" | "category";
}

/**
 * Grouped contact list with sticky section headers.
 * Groups by first-letter (Bangla/English aware) or by category.
 */
export function GroupedContactList({ contacts, query, highlightedId, onClick, groupBy }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, ContactRow[]>();
    for (const c of contacts) {
      const key =
        groupBy === "category"
          ? c.category === "অন্যান্য" && c.custom_category
            ? c.custom_category
            : c.category || "অন্যান্য"
          : getSectionKey(c.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }

    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (groupBy === "category") {
        // Preserve CATEGORIES order, custom categories after
        const ai = CATEGORIES.findIndex((c) => c.value === a);
        const bi = CATEGORIES.findIndex((c) => c.value === b);
        if (ai >= 0 && bi >= 0) return ai - bi;
        if (ai >= 0) return -1;
        if (bi >= 0) return 1;
        return a.localeCompare(b, "bn");
      }
      return sectionSortIndex(a) - sectionSortIndex(b);
    });

    // Sort contacts within each group by name
    for (const [, list] of sorted) {
      list.sort((x, y) => x.name.localeCompare(y.name, "bn"));
    }
    return sorted;
  }, [contacts, groupBy]);

  return (
    <div className="rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.55)] overflow-hidden">
      {groups.map(([key, list]) => (
        <section key={key}>
          <header
            className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.96)] px-3.5 py-1.5 backdrop-blur-sm"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--heirloom-gold-deep))]">
              {key}
            </span>
            <span className="text-[10px] text-[hsl(var(--heirloom-ink-mute))]">
              {list.length}
            </span>
          </header>
          {list.map((c, i) => (
            <ContactListItem
              key={c.id}
              contact={c}
              index={i}
              onClick={onClick}
              query={query}
              highlighted={c.id === highlightedId}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
