import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil, MessageCircle, LogOut, Phone, Mail, MapPin, Droplets, Calendar,
  Facebook, Heart, Globe, Save, X, ShieldAlert,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhoneWithMessengers, PhoneEntry, deriveMessengers, parseMessengersToPhones } from "@/components/PhoneWithMessengers";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { updateVerifiedContact, updateContactViaOtpSession } from "@/lib/store";
import { getMeSession, clearMeSession, updateMeContactSnapshot } from "@/lib/userSession";
import { getChatSession, clearChatSession } from "@/lib/chatSession";
import { toast } from "sonner";

/**
 * /me — the single view/edit surface for the verified end-user.
 *
 * Requires a MeSession (created by /verify or by ContactForm's success screen).
 * Without one it redirects to /verify?next=view.
 *
 * Query params:
 *   ?edit=1 → open in edit mode directly
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

  const chatSession = getChatSession();
  const hasChat = !!chatSession;
  const isOtpAuth = session?.auth.type === "otp";

  useEffect(() => {
    if (!session) navigate("/verify?next=view", { replace: true });
  }, [session, navigate]);

  if (!session) return null;

  const contact = session.contact;

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

  // ============ VIEW MODE ============
  if (!editing) {
    return (
      <div className="flex min-h-app flex-col bg-[hsl(var(--heirloom-bg))]">
        <Header />
        <main className="relative flex-1 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto w-full max-w-2xl">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10"
            >
              <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />
              <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
              <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
              <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
              <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />

              <div className="relative">
                {/* Profile header */}
                <div className="flex flex-col items-center text-center">
                  {contact.photo_url ? (
                    <img src={contact.photo_url} alt={contact.name} className="h-24 w-24 rounded-full object-cover border-2 border-[hsl(var(--heirloom-gold))]/50 shadow-sm" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold))]/40 bg-[hsl(var(--heirloom-bg))] font-display text-3xl text-[hsl(var(--heirloom-ink))]">
                      {contact.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <h1 className="mt-5 font-display text-2xl leading-tight text-[hsl(var(--heirloom-ink))] sm:text-3xl">
                    {contact.name}
                  </h1>
                  {contact.category && (
                    <p className="mt-1.5 text-sm text-[hsl(var(--heirloom-ink-mute))]">
                      {contact.custom_category || contact.category}
                    </p>
                  )}
                  <div aria-hidden className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />
                </div>

                {/* Details grid */}
                <div className="mt-7 space-y-3 text-[14px] sm:text-[15px]">
                  <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="ফোন" value={contact.phone} mono />
                  {contact.email && <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="ইমেইল" value={contact.email} />}
                  {contact.facebook && <DetailRow icon={<Globe className="h-3.5 w-3.5" />} label="ফেসবুক" value={contact.facebook} />}
                  {contact.address && <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="ঠিকানা" value={contact.address} />}
                  {contact.blood_group && <DetailRow icon={<Droplets className="h-3.5 w-3.5" />} label="রক্তের গ্রুপ" value={contact.blood_group} />}
                  {contact.birthday && <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="জন্মদিন" value={contact.birthday} />}
                  {contact.note && (
                    <div className="rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-cream)/0.4)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[hsl(var(--heirloom-ink-mute))]">নোট</p>
                      <p className="mt-1 whitespace-pre-wrap text-[hsl(var(--heirloom-ink))]">{contact.note}</p>
                    </div>
                  )}
                </div>

                {/* OTP-auth banner: no secret code yet */}
                {isOtpAuth && (
                  <div className="mt-6 flex items-start gap-2 rounded-sm border border-[hsl(var(--heirloom-gold)/0.35)] bg-[hsl(var(--heirloom-gold)/0.08)] p-3">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--heirloom-gold-deep))]" />
                    <p className="text-xs text-[hsl(var(--heirloom-ink-soft))]">
                      চ্যাট চালু করতে ও ভবিষ্যতে সহজে সাইন-ইন করতে একটি সিক্রেট কোড সেট করে রাখুন।{" "}
                      <button onClick={startEdit} className="underline underline-offset-2 text-[hsl(var(--heirloom-gold-deep))]">এডিটে গিয়ে যোগ করুন</button>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <Button onClick={startEdit} variant="heirloom" size="lg" className="w-full gap-2 rounded-sm">
                    <Pencil className="h-4 w-4" /> তথ্য এডিট করুন
                  </Button>
                  {hasChat ? (
                    <Link to="/chat" className="w-full">
                      <Button variant="heirloomGhost" size="lg" className="w-full gap-2 rounded-sm">
                        <MessageCircle className="h-4 w-4 text-[hsl(var(--heirloom-gold-deep))]" /> এডমিনকে মেসেজ
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/verify?next=chat" className="w-full">
                      <Button variant="heirloomGhost" size="lg" className="w-full gap-2 rounded-sm">
                        <MessageCircle className="h-4 w-4 text-[hsl(var(--heirloom-gold-deep))]" /> চ্যাট চালু করুন
                      </Button>
                    </Link>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="mx-auto mt-8 flex items-center gap-1.5 text-xs text-[hsl(var(--heirloom-ink-mute))] hover:text-[hsl(var(--heirloom-ink))]"
                >
                  <LogOut className="h-3.5 w-3.5" /> সাইন-আউট
                </button>
              </div>
            </motion.article>
          </div>
        </main>
      </div>
    );
  }

  // ============ EDIT MODE ============
  return (
    <div className="flex min-h-app flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />
      <main className="relative flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10"
          >
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />

            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl text-[hsl(var(--heirloom-ink))] sm:text-2xl">তথ্য আপডেট করুন</h2>
                <button
                  onClick={cancelEdit}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--heirloom-ink-mute))] hover:bg-[hsl(var(--heirloom-line)/0.3)]"
                  aria-label="বাতিল"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="heirloom-chip mb-5 rounded-sm border p-3 text-xs">
                ফোন নম্বরটি স্থির রাখা হয়েছে যাতে আপনার একাউন্ট সঠিক থাকে।
              </div>

              <div className="space-y-4">
                <PhotoUpload value={form.photo_url || undefined} onChange={(url) => setForm({ ...form, photo_url: url })} />
                <div className="space-y-2">
                  <Label>নাম</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-card" />
                </div>
                <PhoneWithMessengers phones={phones} onChange={setPhones} firstPhoneReadOnly />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5 text-blue-600" /> ফেসবুক</Label>
                  <Input value={form.facebook || ""} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="bg-card" placeholder="প্রোফাইল লিংক বা ইউজারনেম" />
                </div>
                <div className="space-y-2">
                  <Label>ইমেইল</Label>
                  <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-card" />
                </div>
                <div className="space-y-2">
                  <Label>ক্যাটাগরি</Label>
                  <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ঠিকানা</Label>
                  <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-card" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>রক্তের গ্রুপ</Label>
                    <Select value={form.blood_group || ""} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>{BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>জন্মদিন</Label>
                    <Input type="date" value={form.birthday || ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="bg-card" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>নোট</Label>
                  <Textarea value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className="bg-card min-h-[80px]" />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={cancelEdit} variant="heirloomGhost" className="flex-1 rounded-sm">বাতিল</Button>
                <Button onClick={handleSave} variant="heirloom" className="flex-1 gap-2" disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 border-b border-[hsl(var(--heirloom-line)/0.4)] pb-2.5">
      <div className="mt-0.5 text-[hsl(var(--heirloom-gold-deep))]">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--heirloom-ink-mute))]">{label}</p>
        <p className={`mt-0.5 text-[hsl(var(--heirloom-ink))] break-words ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

export default MyInfo;
