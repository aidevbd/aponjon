import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Phone, MessageCircle, Video, Send, Mail, MapPin, Droplets, Calendar, Edit3, Trash2, StickyNote, Copy, FileText, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/types";
import { CategoryIcon } from "@/lib/categoryIcons";
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
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
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

  return createPortal(
    <div className="contact-detail-root fixed inset-0 z-[100] overflow-y-auto bg-background/70 md:backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-detail-title"
        className="contact-detail-panel min-h-[100dvh] md:min-h-0 md:max-h-[90dvh] md:w-full md:max-w-2xl lg:max-w-3xl md:rounded-2xl md:border md:border-border md:shadow-xl md:overflow-hidden bg-background"
      >
        <div className="flex h-12 shrink-0 items-center justify-between md:justify-end border-b border-border bg-background px-4 sticky top-0 z-10">
          <h2 id="contact-detail-title" className="md:hidden text-sm font-medium text-muted-foreground">বিস্তারিত</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="contact-detail-scroll bg-background px-4 sm:px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 md:max-h-[calc(90dvh-3rem)] md:overflow-y-auto">
          <div className="contact-detail-content min-h-full bg-background mx-auto max-w-xl">

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
              {category && (
                <span className="love-badge text-xs inline-flex items-center gap-1">
                  <CategoryIcon category={category.value} className="h-3 w-3" />
                  {category.value}
                </span>
              )}
              {contact.custom_category && <span className="love-badge text-xs">✨ {contact.custom_category}</span>}
              {contact.blood_group && (
                <span className="text-xs bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium">{contact.blood_group}</span>
              )}
            </div>
          </div>
        </div>

        {/* সারাংশ — instant snapshot: phone + short note + quick actions */}
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <button
            type="button"
            onClick={() => callPhone(contact.phone)}
            className="flex w-full items-center gap-2 text-left"
          >
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <span className="text-base font-medium text-foreground truncate">{contact.phone}</span>
          </button>

          {contact.note && (
            <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5 mt-0.5 text-primary/70 shrink-0" />
              <p className="line-clamp-2 leading-snug">{contact.note}</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => callPhone(contact.phone)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Phone className="h-3.5 w-3.5 text-primary" /> কল
            </button>
            <button
              type="button"
              onClick={() => hasWhatsApp && openWhatsApp(contact.whatsapp!.split(",")[0].trim())}
              disabled={!hasWhatsApp}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => hasIMO && openIMO(contact.imo!.split(",")[0].trim())}
              disabled={!hasIMO}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Video className="h-3.5 w-3.5 text-primary" /> IMO
            </button>
          </div>
        </div>

        {/* Quick Action Grid - 2x2 like reference */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <button
            type="button"
            onClick={() => callPhone(contact.phone)}
            className="contact-action-card flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary"
          >
            <div className="contact-action-icon flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">কল করুন</span>
          </button>

          <button
            type="button"
            onClick={() => hasWhatsApp ? openWhatsApp(contact.whatsapp!.split(",")[0].trim()) : null}
            disabled={!hasWhatsApp}
            className="contact-action-card flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:bg-muted"
          >
            <div className="contact-action-icon flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => hasIMO ? openIMO(contact.imo!.split(",")[0].trim()) : null}
            disabled={!hasIMO}
            className="contact-action-card flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:bg-muted"
          >
            <div className="contact-action-icon flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">IMO</span>
          </button>

          <button
            type="button"
            onClick={() => hasFacebook ? openFacebook(contact.facebook!) : null}
            disabled={!hasFacebook}
            className="contact-action-card flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:bg-muted"
          >
            <div className="contact-action-icon flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Facebook</span>
          </button>
        </div>

        {/* Telegram row if available */}
        {hasTelegram && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => openTelegram(contact.telegram!.split(",")[0].trim())}
              className="contact-action-card w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary"
            >
              <div className="contact-action-icon flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Send className="h-5 w-5 text-primary" />
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <MessageCircle className="h-5 w-5 text-primary" />
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Video className="h-5 w-5 text-primary" />
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Send className="h-5 w-5 text-primary" />
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
    </div>,
    document.body,
  );
}
