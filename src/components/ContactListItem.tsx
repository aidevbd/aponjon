import {
  Phone,
  Heart,
  Users,
  Handshake,
  Briefcase,
  Home,
  GraduationCap,
  Siren,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";

interface ContactListItemProps {
  contact: ContactRow;
  index: number;
  onClick: (contact: ContactRow) => void;
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "পরিবার": Heart,
  "আত্মীয়": Users,
  "বন্ধু": Handshake,
  "সহকর্মী": Briefcase,
  "প্রতিবেশী": Home,
  "শিক্ষক/গুরু": GraduationCap,
  "জরুরি": Siren,
  "অন্যান্য": Bookmark,
};

export function ContactListItem({ contact, onClick }: ContactListItemProps) {
  const category = CATEGORIES.find((c) => c.value === contact.category);
  const CategoryIcon = category ? CATEGORY_ICON[category.value] ?? Bookmark : null;
  const isEmergency = contact.category === "জরুরি";

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
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[hsl(var(--heirloom-ink-soft))]">
          {category && CategoryIcon && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${
                isEmergency
                  ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]"
                  : "border-[hsl(var(--heirloom-gold)/0.3)] bg-[hsl(var(--heirloom-gold)/0.06)] text-[hsl(var(--heirloom-gold-deep))]"
              }`}
              title={category.value}
              aria-label={category.value}
            >
              <CategoryIcon className="h-3 w-3" strokeWidth={1.75} />
              <span>{category.value}</span>
            </span>
          )}
          {contact.blood_group && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))] font-medium">
              {contact.blood_group}
            </span>
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
        <Phone className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
