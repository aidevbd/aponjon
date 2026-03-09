import { Phone, MessageCircle, Mail, MapPin, Droplets, Calendar, Edit3, Trash2, StickyNote, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";

interface ContactDetailSheetProps {
  contact: ContactRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: (contact: ContactRow) => void;
  onDelete: (id: string) => void;
}

export function ContactDetailSheet({ contact, open, onClose, onEdit, onDelete }: ContactDetailSheetProps) {
  if (!contact) return null;

  const category = CATEGORIES.find((c) => c.value === contact.category);

  const callPhone = (num: string) => window.open(`tel:${num}`, "_self");
  const openWhatsApp = (num: string) => window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`, "_blank");
  const openIMO = (num: string) => window.open(`https://imoapp.com/${num.replace(/[^0-9]/g, "")}`, "_blank");
  const openTelegram = (num: string) => window.open(`https://t.me/${num.replace(/[^0-9]/g, "")}`, "_blank");
  const openFacebook = (fb: string) => {
    const url = fb.startsWith("http") ? fb : `https://facebook.com/${fb}`;
    window.open(url, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="sr-only">{contact.name}</SheetTitle>
        </SheetHeader>

        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          {contact.photo_url ? (
            <img src={contact.photo_url} alt={contact.name} className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
              {contact.name.charAt(0)}
            </div>
          )}
          <div className="text-center">
            <h2 className="text-xl font-display font-semibold text-foreground">{contact.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              {category && <span className="love-badge text-xs">{category.icon} {category.value}</span>}
              {contact.custom_category && <span className="love-badge text-xs">✨ {contact.custom_category}</span>}
              {contact.blood_group && (
                <span className="text-xs bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium">{contact.blood_group}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button onClick={() => callPhone(contact.phone)} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            <Phone className="h-4 w-4" /> {contact.phone}
          </button>
          {contact.whatsapp?.split(",").map((num, i) => (
            <button key={`wa-${i}`} onClick={() => openWhatsApp(num.trim())} className="flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          ))}
          {contact.imo?.split(",").map((num, i) => (
            <button key={`imo-${i}`} onClick={() => openIMO(num.trim())} className="flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors">
              <Phone className="h-4 w-4" /> IMO
            </button>
          ))}
          {contact.telegram?.split(",").map((num, i) => (
            <button key={`tg-${i}`} onClick={() => openTelegram(num.trim())} className="flex items-center gap-1.5 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-200 transition-colors">
              <Send className="h-4 w-4" /> Telegram
            </button>
          ))}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/80 transition-colors">
              <Mail className="h-4 w-4" /> ইমেইল
            </a>
          )}
          {contact.facebook && (
            <button onClick={() => openFacebook(contact.facebook!)} className="flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-200 transition-colors">
              🌐 Facebook
            </button>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm text-muted-foreground">
          {contact.address && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-accent/30">
              <MapPin className="h-4 w-4 text-primary/60 shrink-0" /> <span>{contact.address}</span>
            </div>
          )}
          {contact.birthday && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-accent/30">
              <Calendar className="h-4 w-4 text-primary/60 shrink-0" /> <span>জন্মদিন: {new Date(contact.birthday).toLocaleDateString("bn-BD")}</span>
            </div>
          )}
          {contact.note && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent/30">
              <StickyNote className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
              <p className="text-sm">{contact.note}</p>
            </div>
          )}
        </div>

        {/* Edit / Delete at bottom */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => { onClose(); onEdit(contact); }}>
            <Edit3 className="h-4 w-4" /> এডিট
          </Button>
          <Button variant="outline" className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => { onClose(); onDelete(contact.id); }}>
            <Trash2 className="h-4 w-4" /> ডিলিট
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
