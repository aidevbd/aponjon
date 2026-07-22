import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Pencil, MessageCircle, LogOut, Phone, Mail, MapPin, Droplets, Calendar,
  Facebook, Save, X, ShieldAlert, Copy, Video, Send, ExternalLink, FileText,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhoneWithMessengers, PhoneEntry, deriveMessengers, parseMessengersToPhones } from "@/components/PhoneWithMessengers";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { CategoryIcon } from "@/lib/categoryIcons";
import { updateVerifiedContact, updateContactViaOtpSession } from "@/lib/store";
import { getMeSession, clearMeSession, updateMeContactSnapshot } from "@/lib/userSession";
import { getChatSession, clearChatSession, createChatSession } from "@/lib/chatSession";
import { ActiveSessionsCard } from "@/components/ActiveSessionsCard";
import { toast } from "sonner";

/**
 * /me — the single view/edit surface for the verified end-user.
 * View mode mirrors the admin ContactDetailSheet layout.
 */
const MyInfo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(getMeSession);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [form, setForm] = useState<any>(session?.contact ?? {});
  const [phones, setPhones] = useState<PhoneEntry[]>(() =>
    session ? parseMessengersToPhones(session.contact.phone, session.contact.whatsapp, session.contact.imo, session.contact.telegram)
            : [{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }],
  );
  const [saving, setSaving] = useState(false);

  const [chatSession, setChatSession] = useState(getChatSession);
  const [openingChat, setOpeningChat] = useState(false);
  const hasChat = !!chatSession;
  const isOtpAuth = session?.auth.type === "otp";
  const canBootstrapChat = session?.auth.type === "secret";

  useEffect(() => {
    if (!session) navigate("/verify?next=view", { replace: true });
  }, [session, navigate]);

  if (!session) return null;

  const contact = session.contact;
  const category = CATEGORIES.find((c) => c.value === contact.category);

  const startEdit = () => {
    setForm(contact);
    setPhones(parseMessengersToPhones(contact.phone, contact.whatsapp, contact.imo, contact.telegram));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(contact);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const messengers = deriveMessengers(phones);
      const payload = {
        name: form.name,
        whatsapp: messengers.whatsapp,
        imo: messengers.imo,
        telegram: messengers.telegram,
        facebook: form.facebook,
        email: form.email,
        category: form.category,
        custom_category: form.custom_category,
        note: form.note,
        address: form.address,
        blood_group: form.blood_group,
        birthday: form.birthday,
        photo_url: form.photo_url,
      };

      if (session.auth.type === "otp") {
        const ok = await updateContactViaOtpSession(session.auth.sessionToken, payload);
        if (!ok) throw new Error("OTP_SESSION_INVALID");
      } else {
        await updateVerifiedContact(session.auth.phone, session.auth.secretCode, payload);
      }

      const updated = { ...contact, ...payload };
      updateMeContactSnapshot(updated);
      setSession(getMeSession());
      setEditing(false);
      toast.success("তথ্য আপডেট হয়েছে 💕");
    } catch (err: any) {
      if (err?.message === "OTP_SESSION_INVALID") {
        toast.error("OTP সেশন শেষ হয়েছে। আবার ভেরিফাই করুন।");
        clearMeSession();
        navigate("/verify?next=edit", { replace: true });
      } else {
        toast.error("আপডেট করতে সমস্যা হয়েছে");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearMeSession();
    clearChatSession();
    toast.success("সাইন-আউট হয়েছে");
    navigate("/", { replace: true });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("কপি হয়েছে!");
  };

  const callPhone = (num: string) => window.open(`tel:${num}`, "_self");
  const openWhatsApp = (num: string) => window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`, "_blank");
  const openIMO = (num: string) => window.open(`https://imoapp.com/${num.replace(/[^0-9]/g, "")}`, "_blank");
  const openTelegram = (num: string) => window.open(`https://t.me/${num.replace(/[^0-9]/g, "")}`, "_blank");
  const openFacebook = (fb: string) => {
    const url = fb.startsWith("http") ? fb : `https://facebook.com/${fb}`;
    window.open(url, "_blank");
  };

  const hasWhatsApp = !!(contact.whatsapp && contact.whatsapp.trim());
  const hasIMO = !!(contact.imo && contact.imo.trim());
  const hasTelegram = !!(contact.telegram && contact.telegram.trim());
  const hasFacebook = !!(contact.facebook && contact.facebook.trim());

  // ============ VIEW MODE ============
  if (!editing) {
    return (
      <div className="flex min-h-app flex-col bg-background">
        <Header />
        <main className="relative flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto w-full max-w-xl"
          >
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
              <Button onClick={startEdit} className="h-12 gap-2 rounded-xl">
                <Pencil className="h-4 w-4" /> তথ্য এডিট
              </Button>
              {hasChat ? (
                <Link to="/chat">
                  <Button variant="outline" className="w-full h-12 gap-2 rounded-xl">
                    <MessageCircle className="h-4 w-4" /> এডমিনকে মেসেজ
                  </Button>
                </Link>
              ) : canBootstrapChat ? (
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2 rounded-xl"
                  disabled={openingChat}
                  onClick={async () => {
                    if (session.auth.type !== "secret") return;
                    setOpeningChat(true);
                    try {
                      const cs = await createChatSession(session.auth.phone, session.auth.secretCode);
                      if (cs) {
                        setChatSession(cs);
                        navigate("/chat");
                      } else {
                        toast.error("চ্যাট চালু করা যায়নি। আবার চেষ্টা করুন।");
                      }
                    } catch (e: any) {
                      if (e?.message === "RATE_LIMITED") toast.error("অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন।");
                      else toast.error("চ্যাট চালু করা যায়নি।");
                    } finally {
                      setOpeningChat(false);
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4" /> {openingChat ? "চালু হচ্ছে..." : "এডমিনকে মেসেজ"}
                </Button>
              ) : (
                <Link to="/verify?next=chat">
                  <Button variant="outline" className="w-full h-12 gap-2 rounded-xl">
                    <MessageCircle className="h-4 w-4" /> চ্যাট চালু করুন
                  </Button>
                </Link>
              )}
            </div>


            {/* OTP-auth banner — set secret code prompt */}
            {isOtpAuth && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-[hsl(var(--heirloom-gold)/0.35)] bg-[hsl(var(--heirloom-gold)/0.08)] p-3">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--heirloom-gold-deep))]" />
                <p className="text-xs text-[hsl(var(--heirloom-ink-soft))]">
                  ভবিষ্যতে সহজে সাইন-ইন করতে একটি সিক্রেট কোড সেট করে রাখুন।{" "}
                  <button onClick={startEdit} className="underline underline-offset-2 text-[hsl(var(--heirloom-gold-deep))]">এডিটে গিয়ে যোগ করুন</button>
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

            {/* যোগাযোগ তথ্য — read-only, no self-call/copy buttons */}
            <div className="rounded-xl border border-border bg-card p-4 mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">যোগাযোগ তথ্য</h3>
              <div className="space-y-3">
                <ReadRow icon={<Phone className="h-5 w-5 text-primary" />} label="মোবাইল নম্বর" value={contact.phone} mono />
                {hasWhatsApp && contact.whatsapp!.split(",").map((n, i) => (
                  <ReadRow key={`wa-${i}`} icon={<MessageCircle className="h-5 w-5 text-primary" />} label="WhatsApp" value={n.trim()} mono />
                ))}
                {hasIMO && contact.imo!.split(",").map((n, i) => (
                  <ReadRow key={`imo-${i}`} icon={<Video className="h-5 w-5 text-primary" />} label="IMO" value={n.trim()} mono />
                ))}
                {hasTelegram && contact.telegram!.split(",").map((n, i) => (
                  <ReadRow key={`tg-${i}`} icon={<Send className="h-5 w-5 text-primary" />} label="Telegram" value={n.trim()} mono />
                ))}
                {contact.email && (
                  <ReadRow icon={<Mail className="h-5 w-5 text-primary" />} label="ইমেইল" value={contact.email} />
                )}
                {hasFacebook && (
                  <ReadRow icon={<Facebook className="h-5 w-5 text-primary" />} label="ফেসবুক" value={contact.facebook!} />
                )}
              </div>
            </div>

            {/* Additional details */}
            {(contact.address || contact.birthday) && (
              <div className="rounded-xl border border-border bg-card p-4 mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">অতিরিক্ত তথ্য</h3>
                <div className="space-y-3">
                  {contact.address && (
                    <ReadRow icon={<MapPin className="h-5 w-5 text-primary" />} label="ঠিকানা" value={contact.address} />
                  )}
                  {contact.birthday && (
                    <ReadRow icon={<Calendar className="h-5 w-5 text-primary" />} label="জন্মদিন" value={new Date(contact.birthday).toLocaleDateString("bn-BD")} />
                  )}
                </div>
              </div>
            )}


            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="mx-auto mt-8 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" /> সাইন-আউট
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>সাইন-আউট করবেন?</AlertDialogTitle>
                  <AlertDialogDescription>
                    সাইন-আউট করলে আবার তথ্য দেখতে বা এডিট করতে ভেরিফাই করতে হবে।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>সাইন-আউট</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </motion.div>
        </main>
      </div>
    );
  }

  // ============ EDIT MODE ============
  return (
    <div className="flex min-h-app flex-col bg-background">
      <Header />
      <main className="relative flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto w-full max-w-xl"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">তথ্য আপডেট করুন</h2>
            <button
              onClick={cancelEdit}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="বাতিল"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-5 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            ফোন নম্বরটি স্থির রাখা হয়েছে যাতে আপনার একাউন্ট সঠিক থাকে।
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <PhotoUpload value={form.photo_url || undefined} onChange={(url) => setForm({ ...form, photo_url: url })} />
            <div className="space-y-2">
              <Label>নাম</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background" />
            </div>
            <PhoneWithMessengers phones={phones} onChange={setPhones} firstPhoneReadOnly />
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5 text-blue-600" /> ফেসবুক</Label>
              <Input value={form.facebook || ""} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="bg-background" placeholder="প্রোফাইল লিংক বা ইউজারনেম" />
            </div>
            <div className="space-y-2">
              <Label>ইমেইল</Label>
              <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>ক্যাটাগরি</Label>
              <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ঠিকানা</Label>
              <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>রক্তের গ্রুপ</Label>
                <Select value={form.blood_group || ""} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>জন্মদিন</Label>
                <Input type="date" value={form.birthday || ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>নোট</Label>
              <Textarea value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className="bg-background min-h-[80px]" />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={cancelEdit} variant="outline" className="flex-1 h-12 rounded-xl">বাতিল</Button>
            <Button onClick={handleSave} className="flex-1 gap-2 h-12 rounded-xl" disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

function ReadRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-[15px] text-foreground break-words ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}


export default MyInfo;
