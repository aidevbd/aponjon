import { motion } from "framer-motion";
import { Phone, MessageCircle, Edit3, X, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";

interface ContactListItemProps {
  contact: ContactRow;
  index: number;
  onEdit: (contact: ContactRow) => void;
  onDelete: (id: string) => void;
}

export function ContactListItem({ contact, index, onEdit, onDelete }: ContactListItemProps) {
  const category = CATEGORIES.find((c) => c.value === contact.category);

  const callPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${contact.phone}`, "_self");
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const num = contact.whatsapp?.split(",")[0]?.trim();
    if (num) window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="glass-card p-3 flex items-center gap-3 hover:shadow-rose transition-shadow"
    >
      {/* Avatar */}
      {contact.photo_url ? (
        <img src={contact.photo_url} alt={contact.name} className="h-9 w-9 rounded-full object-cover border border-primary/20 shrink-0" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
          {contact.name.charAt(0)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{contact.name}</span>
          {category && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 shrink-0">{category.icon}</span>}
          {contact.blood_group && <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 shrink-0">{contact.blood_group}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
          {contact.address && <span className="truncate flex items-center gap-0.5"><MapPin className="h-3 w-3" />{contact.address}</span>}
        </div>
      </div>

      {/* Quick Call / WhatsApp buttons */}
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={callPhone} title="কল করুন">
          <Phone className="h-4 w-4" />
        </Button>
        {contact.whatsapp && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={openWhatsApp} title="WhatsApp">
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(contact)}>
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(contact.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
