import { Phone } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";

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
      className="contact-surface flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card cursor-pointer transition-colors border border-transparent hover:border-border/50"
    >
      {/* Avatar */}
      {contact.photo_url ? (
        <img src={contact.photo_url} alt={contact.name} className="h-9 w-9 rounded-full object-cover border border-primary/20 shrink-0" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
          {contact.name.charAt(0)}
        </div>
      )}

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm text-foreground truncate block">{contact.name}</span>
        {category && (
          <span className="text-[10px] text-muted-foreground">{category.icon} {category.value}</span>
        )}
      </div>

      {/* Call button */}
      <button
        onClick={callPhone}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
        title="কল করুন"
        aria-label="কল করুন"
      >
        <Phone className="h-4 w-4" />
      </button>
    </div>
  );
}
