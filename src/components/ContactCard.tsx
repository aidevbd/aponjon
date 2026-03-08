import { motion } from "framer-motion";
import { Phone, MessageCircle, Mail, MapPin, Droplets, Calendar, Edit3, Trash2, StickyNote, Send } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { type ContactRow } from "@/lib/store";

interface ContactCardProps {
  contact: ContactRow;
  onEdit?: (contact: ContactRow) => void;
  onDelete?: (id: string) => void;
  index?: number;
}

export function ContactCard({ contact, onEdit, onDelete, index = 0 }: ContactCardProps) {
  const category = CATEGORIES.find((c) => c.value === contact.category);

  const openWhatsApp = (number: string) => {
    window.open(`https://wa.me/${number.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const openIMO = (number: string) => {
    window.open(`https://imoapp.com/${number.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const openTelegram = (number: string) => {
    window.open(`https://t.me/${number.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const openFacebook = (fb: string) => {
    const url = fb.startsWith("http") ? fb : `https://facebook.com/${fb}`;
    window.open(url, "_blank");
  };

  const callPhone = (number: string) => {
    window.open(`tel:${number}`, "_self");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5 hover:shadow-rose transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {contact.photo_url ? (
            <img src={contact.photo_url} alt={contact.name} className="h-12 w-12 rounded-full object-cover border-2 border-primary/20 shrink-0" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
              {contact.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground text-lg">{contact.name}</h3>
            {category && (
              <span className="love-badge mt-1">
                {category.icon} {category.value}
              </span>
            )}
            {contact.custom_category && (
              <span className="love-badge mt-1 ml-1">✨ {contact.custom_category}</span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(contact)}>
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(contact.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => callPhone(contact.phone)}
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" /> {contact.phone}
        </button>
        {contact.whatsapp && contact.whatsapp.split(",").map((num, i) => (
          <button key={`wa-${i}`} onClick={() => openWhatsApp(num.trim())} className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp {contact.whatsapp!.includes(",") ? num.trim().slice(-4) : ""}
          </button>
        ))}
        {contact.imo && contact.imo.split(",").map((num, i) => (
          <button key={`imo-${i}`} onClick={() => openIMO(num.trim())} className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors">
            <Phone className="h-3.5 w-3.5" /> IMO {contact.imo!.includes(",") ? num.trim().slice(-4) : ""}
          </button>
        ))}
        {contact.telegram && contact.telegram.split(",").map((num, i) => (
          <button key={`tg-${i}`} onClick={() => openTelegram(num.trim())} className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200 transition-colors">
            <Send className="h-3.5 w-3.5" /> Telegram {contact.telegram!.includes(",") ? num.trim().slice(-4) : ""}
          </button>
        ))}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors">
            <Mail className="h-3.5 w-3.5" /> ইমেইল
          </a>
        )}
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        {contact.address && (
          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary/60" /> {contact.address}</div>
        )}
        {contact.blood_group && (
          <div className="flex items-center gap-2"><Droplets className="h-3.5 w-3.5 text-red-400" /> রক্তের গ্রুপ: {contact.blood_group}</div>
        )}
        {contact.birthday && (
          <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary/60" /> জন্মদিন: {new Date(contact.birthday).toLocaleDateString("bn-BD")}</div>
        )}
        {contact.note && (
          <div className="flex items-start gap-2 mt-2 rounded-lg bg-accent/40 p-2.5">
            <StickyNote className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" />
            <p className="text-xs">{contact.note}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
