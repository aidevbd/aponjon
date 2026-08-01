import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ContactListItem } from "@/components/ContactListItem";
import type { ContactRow } from "@/lib/store";

interface Props {
  contacts: ContactRow[];
  query: string;
  highlightedId?: string | null;
  onClick: (c: ContactRow) => void;
  /** Approx row height in px. Auto-measured after first render. */
  estimateSize?: number;
  /** Threshold above which virtualization kicks in. */
  virtualizeAbove?: number;
}

/**
 * Renders a list of contacts. Uses windowed virtualization once the list is
 * large so scrolling stays smooth even with thousands of rows. Small lists fall
 * back to plain rendering (avoids observer overhead).
 */
export function VirtualContactList({
  contacts,
  query,
  highlightedId,
  onClick,
  estimateSize = 78,
  virtualizeAbove = 40,
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const shouldVirtualize = contacts.length > virtualizeAbove;

  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
    getItemKey: (i) => contacts[i]?.id ?? i,
  });

  if (!shouldVirtualize) {
    return (
      <div className="rounded-sm border border-heirloom-line bg-heirloom-paper/[0.55] overflow-hidden">
        {contacts.map((c, i) => (
          <ContactListItem
            key={c.id}
            contact={c}
            index={i}
            onClick={onClick}
            query={query}
            highlighted={c.id === highlightedId}
          />
        ))}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="max-h-[70vh] overflow-y-auto no-scrollbar rounded-sm border border-heirloom-line bg-heirloom-paper/[0.55]"
    >
      <div
        style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}
      >
        {items.map((vi) => {
          const c = contacts[vi.index];
          if (!c) return null;
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <ContactListItem
                contact={c}
                index={vi.index}
                onClick={onClick}
                query={query}
                highlighted={c.id === highlightedId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
