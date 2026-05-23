import { useEffect } from "react";
import { Phone, MessageCircle, Video, Send, Mail, MapPin, Droplets, Calendar, Edit3, Trash2, StickyNote, Copy, FileText, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/types";
import { type ContactRow } from "@/lib/store";
import { toast } from "sonner";

interface ContactDetailSheetProps {
  contact: ContactRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: (contact: ContactRow) => void;
  onDelete: (id: string) => void;
}

export function ContactDetailSheet({ contact, open, onClose, onEdit, onDelete }: ContactDetailSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("কপি হয়েছে!");
  };

  const hasWhatsApp = contact.whatsapp && contact.whatsapp.trim();
  const hasIMO = contact.imo && contact.imo.trim();
  const hasTelegram = contact.telegram && contact.telegram.trim();
  const hasFacebook = contact.facebook && contact.facebook.trim();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-detail-title"
        className="contact-detail-panel fixed inset-x-0 bottom-0 top-[15dvh] z-50 overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-lg"
      >
        <div className="absolute inset-0 bg-background" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="বন্ধ করুন"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="contact-detail-scroll relative h-full overflow-y-auto bg-background px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6">

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

        {/* Quick Action Grid - 2x2 like reference */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => callPhone(contact.phone)}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">কল করুন</span>
          </button>

          <button
            onClick={() => hasWhatsApp ? openWhatsApp(contact.whatsapp!.split(",")[0].trim()) : null}
            disabled={!hasWhatsApp}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-foreground">WhatsApp</span>
          </button>

          <button
            onClick={() => hasIMO ? openIMO(contact.imo!.split(",")[0].trim()) : null}
            disabled={!hasIMO}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/15">
              <Video className="h-6 w-6 text-sky-600" />
            </div>
            <span className="text-sm font-medium text-foreground">IMO</span>
          </button>

          <button
            onClick={() => hasFacebook ? openFacebook(contact.facebook!) : null}
            disabled={!hasFacebook}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15">
              <ExternalLink className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-foreground">Facebook</span>
          </button>
        </div>

        {/* Telegram row if available */}
        {hasTelegram && (
          <div className="mb-6">
            <button
              onClick={() => openTelegram(contact.telegram!.split(",")[0].trim())}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 hover:bg-primary/10 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15">
                <Send className="h-5 w-5 text-sky-500" />
              </div>
              <span className="text-sm font-medium text-foreground">Telegram</span>
            </button>
          </div>
        )}

        {/* পরিচিতি / Identity section */}
        {contact.note && (
          <div className="mb-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">পরিচিতি</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{contact.note}</p>
          </div>
        )}

        {/* যোগাযোগ তথ্য / Contact Info */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">যোগাযোগ তথ্য</h3>
          
          <div className="space-y-3">
            {/* Main phone */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">মোবাইল নম্বর (মূল)</p>
                <p className="text-base font-medium text-foreground">{contact.phone}</p>
              </div>
              <button onClick={() => copyToClipboard(contact.phone)} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* WhatsApp numbers */}
            {hasWhatsApp && contact.whatsapp!.split(",").map((num, i) => (
              <div key={`wa-${i}`} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="text-base font-medium text-foreground">{num.trim()}</p>
                </div>
                <button onClick={() => copyToClipboard(num.trim())} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* IMO numbers */}
            {hasIMO && contact.imo!.split(",").map((num, i) => (
              <div key={`imo-${i}`} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10">
                  <Video className="h-5 w-5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">IMO</p>
                  <p className="text-base font-medium text-foreground">{num.trim()}</p>
                </div>
                <button onClick={() => copyToClipboard(num.trim())} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Telegram */}
            {hasTelegram && contact.telegram!.split(",").map((num, i) => (
              <div key={`tg-${i}`} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10">
                  <Send className="h-5 w-5 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Telegram</p>
                  <p className="text-base font-medium text-foreground">{num.trim()}</p>
                </div>
                <button onClick={() => copyToClipboard(num.trim())} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Email */}
            {contact.email && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <Mail className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">ইমেইল</p>
                  <p className="text-base font-medium text-foreground">{contact.email}</p>
                </div>
                <button onClick={() => copyToClipboard(contact.email!)} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional details */}
        {(contact.address || contact.birthday) && (
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">অতিরিক্ত তথ্য</h3>
            <div className="space-y-3">
              {contact.address && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ঠিকানা</p>
                    <p className="text-sm text-foreground">{contact.address}</p>
                  </div>
                </div>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">জন্মদিন</p>
                    <p className="text-sm text-foreground">{new Date(contact.birthday).toLocaleDateString("bn-BD")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit / Delete at bottom */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 gap-2 h-12 rounded-xl" onClick={() => { onClose(); onEdit(contact); }}>
            <Edit3 className="h-4 w-4" /> এডিট
          </Button>
          <Button variant="outline" className="flex-1 gap-2 h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => { onClose(); onDelete(contact.id); }}>
            <Trash2 className="h-4 w-4" /> ডিলিট
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
