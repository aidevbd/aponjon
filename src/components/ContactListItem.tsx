import { Phone } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";
import { CategoryIcon } from "@/lib/categoryIcon";

interface ContactListItemProps {
  contact: ContactRow;
  index: number;
  onClick: (contact: ContactRow) => void;
}

export function ContactListItem({ contact, onClick }: ContactListItemProps) {
  const category = CATEGORIES.find((c) => c.value === contact.category);

  const callPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${contact.phone}`, "_self");
  };

  return (
    <div
      onClick={() => onClick(contact)}
      className="group flex items-center gap-3 px-3.5 py-3 border-b border-[hsl(var(--heirloom-line)/0.7)] cursor-pointer transition-colors hover:bg-[hsl(var(--heirloom-cream)/0.45)]"
    >
      {/* Avatar */}
      {contact.photo_url ? (
        <img
          src={contact.photo_url}
          alt={contact.name}
          className="h-10 w-10 rounded-full object-cover border border-[hsl(var(--heirloom-gold)/0.35)] shrink-0"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.08)] text-[hsl(var(--heirloom-gold-deep))] font-display text-[15px] shrink-0">
          {contact.name.charAt(0)}
        </div>
      )}

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-[hsl(var(--heirloom-ink))] truncate">
          {contact.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[hsl(var(--heirloom-ink-soft))]">
          {category && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon category={category.value} className="h-3 w-3 text-[hsl(var(--heirloom-gold-deep))]" />
              <span>{category.value}</span>
            </span>
          )}
          {contact.blood_group && (
            <>
              <span className="text-[hsl(var(--heirloom-line))]">·</span>
              <span className="text-[hsl(var(--heirloom-gold-deep))]">{contact.blood_group}</span>
            </>
          )}
        </div>
      </div>

      {/* Call */}
      <button
        onClick={callPhone}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.06)] text-[hsl(var(--heirloom-gold-deep))] transition-colors hover:bg-[hsl(var(--heirloom-gold)/0.15)] shrink-0"
        title="কল করুন"
        aria-label="কল করুন"
      >
        <Phone className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
    </div>
  );
}
