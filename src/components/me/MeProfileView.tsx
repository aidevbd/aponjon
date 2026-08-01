import { Link } from "react-router-dom";
import {
  Pencil, MessageCircleHeart, MessageCircle, Phone, Mail, MapPin, Calendar,
  Facebook, ShieldAlert, Video, Send, FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/types";
import { CategoryIcon } from "@/lib/categoryIcons";
import { ReadRow } from "@/components/me/ReadRow";

type Props = {
  contact: any;
  isOtpAuth: boolean;
  hasChat: boolean;
  canBootstrapChat: boolean;
  openingChat: boolean;
  onEdit: () => void;
  onStartChat: () => void;
};

export function MeProfileView({
  contact, isOtpAuth, hasChat, canBootstrapChat, openingChat, onEdit, onStartChat,
}: Props) {
  const category = CATEGORIES.find((c) => c.value === contact.category);
  const hasWhatsApp = !!contact.whatsapp?.trim();
  const hasIMO = !!contact.imo?.trim();
  const hasTelegram = !!contact.telegram?.trim();
  const hasFacebook = !!contact.facebook?.trim();

  return (
    <>
      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        {contact.photo_url ? (
          <img src={contact.photo_url} alt={contact.name} className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
            {contact.name?.charAt(0) || "?"}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-xl font-display font-semibold text-foreground">{contact.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
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

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button onClick={onEdit} className="h-12 gap-2 rounded-xl">
          <Pencil className="h-4 w-4" /> তথ্য এডিট
        </Button>
        {hasChat ? (
          <Link to="/chat">
            <Button variant="outline" className="w-full h-12 gap-2 rounded-xl">
              <MessageCircleHeart className="h-4 w-4" /> আমাকে লিখুন
            </Button>
          </Link>
        ) : canBootstrapChat ? (
          <Button variant="outline" className="w-full h-12 gap-2 rounded-xl" disabled={openingChat} onClick={onStartChat}>
            <MessageCircleHeart className="h-4 w-4" /> {openingChat ? "চালু হচ্ছে..." : "আমাকে লিখুন"}
          </Button>
        ) : (
          <Link to="/verify?next=chat">
            <Button variant="outline" className="w-full h-12 gap-2 rounded-xl">
              <MessageCircleHeart className="h-4 w-4" /> আমাকে লিখুন
            </Button>
          </Link>
        )}
      </div>

      {/* OTP-auth banner — set secret code prompt */}
      {isOtpAuth && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-heirloom-gold/[0.35] bg-heirloom-gold/[0.08] p-3">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-heirloom-gold-deep" />
          <p className="text-xs text-heirloom-ink-soft">
            ভবিষ্যতে সহজে সাইন-ইন করতে একটি সিক্রেট কোড সেট করে রাখুন।{" "}
            <button onClick={onEdit} className="underline underline-offset-2 text-heirloom-gold-deep">এডিটে গিয়ে যোগ করুন</button>
          </p>
        </div>
      )}

      {/* Note / পরিচিতি */}
      {contact.note && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">পরিচিতি</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{contact.note}</p>
        </div>
      )}

      {/* যোগাযোগ তথ্য */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">যোগাযোগ তথ্য</h2>
        <div className="space-y-3">
          <ReadRow icon={<Phone className="h-5 w-5 text-primary" />} label="মোবাইল নম্বর" value={contact.phone} mono />
          {hasWhatsApp && contact.whatsapp.split(",").map((n: string, i: number) => (
            <ReadRow key={`wa-${i}`} icon={<MessageCircle className="h-5 w-5 text-primary" />} label="WhatsApp" value={n.trim()} mono />
          ))}
          {hasIMO && contact.imo.split(",").map((n: string, i: number) => (
            <ReadRow key={`imo-${i}`} icon={<Video className="h-5 w-5 text-primary" />} label="IMO" value={n.trim()} mono />
          ))}
          {hasTelegram && contact.telegram.split(",").map((n: string, i: number) => (
            <ReadRow key={`tg-${i}`} icon={<Send className="h-5 w-5 text-primary" />} label="Telegram" value={n.trim()} mono />
          ))}
          {contact.email && <ReadRow icon={<Mail className="h-5 w-5 text-primary" />} label="ইমেইল" value={contact.email} />}
          {hasFacebook && <ReadRow icon={<Facebook className="h-5 w-5 text-primary" />} label="ফেসবুক" value={contact.facebook} />}
        </div>
      </div>

      {/* Additional details */}
      {(contact.address || contact.birthday) && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">অতিরিক্ত তথ্য</h2>
          <div className="space-y-3">
            {contact.address && (
              <ReadRow icon={<MapPin className="h-5 w-5 text-primary" />} label="ঠিকানা" value={contact.address} />
            )}
            {contact.birthday && (
              <ReadRow
                icon={<Calendar className="h-5 w-5 text-primary" />}
                label="জন্মদিন"
                value={new Date(contact.birthday).toLocaleDateString("bn-BD")}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
