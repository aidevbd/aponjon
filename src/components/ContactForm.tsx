import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Mail, MapPin, Droplets, Calendar, Lock, Info, CheckCircle2, Facebook, MessageCircle, Pencil, UserPlus, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { saveContact } from "@/lib/store";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhoneWithMessengers, PhoneEntry, deriveMessengers } from "@/components/PhoneWithMessengers";
import { createChatSession } from "@/lib/chatSession";
import { saveMeSession } from "@/lib/userSession";
import { toast } from "sonner";

export function ContactForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showSecretWarning, setShowSecretWarning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [savedProfile, setSavedProfile] = useState<{ name: string; phone: string; photoUrl: string; category: string } | null>(null);
  const [phones, setPhones] = useState<PhoneEntry[]>([
    { number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false },
  ]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    facebook: "",
    category: "",
    customCategory: "",
    note: "",
    address: "",
    bloodGroup: "",
    birthday: "",
    secretCode: "",
    photoUrl: "",
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "secretCode" && value === "") {
      setShowSecretWarning(true);
    } else if (field === "secretCode" && value !== "") {
      setShowSecretWarning(false);
    }
  };

  const handleSubmit = async () => {
    const primaryPhone = phones[0]?.number.trim();
    if (!form.name.trim() || !primaryPhone) {
      toast.error("নাম এবং ফোন নম্বর আবশ্যক");
      return;
    }

    setLoading(true);
    try {
      const messengers = deriveMessengers(phones);

      await saveContact({
        name: form.name,
        phone: primaryPhone,
        whatsapp: messengers.whatsapp || undefined,
        imo: messengers.imo || undefined,
        telegram: messengers.telegram || undefined,
        facebook: form.facebook || undefined,
        email: form.email,
        category: form.category || "অন্যান্য",
        custom_category: form.customCategory,
        note: form.note,
        address: form.address,
        blood_group: form.bloodGroup,
        birthday: form.birthday,
        secret_code: form.secretCode,
        photo_url: form.photoUrl,
      });

      const displayCategory =
        form.category === "অন্যান্য" && form.customCategory
          ? form.customCategory
          : form.category || "অন্যান্য";
      setSavedProfile({
        name: form.name.trim(),
        phone: primaryPhone,
        photoUrl: form.photoUrl,
        category: displayCategory,
      });

      // Auto-create a chat session if the user set a secret code so messaging
      // works with a single tap on the success screen. Also seed MeSession so
      // /me works without re-verification.
      if (form.secretCode && form.secretCode.trim()) {
        try {
          const session = await createChatSession(primaryPhone, form.secretCode.trim());
          if (session) setChatReady(true);
        } catch {
          // Non-fatal
        }
        // Seed unified MeSession for view/edit on /me
        try {
          saveMeSession(
            { type: "secret", phone: primaryPhone, secretCode: form.secretCode.trim() },
            {
              name: form.name,
              phone: primaryPhone,
              whatsapp: messengers.whatsapp,
              imo: messengers.imo,
              telegram: messengers.telegram,
              facebook: form.facebook,
              email: form.email,
              category: form.category || "অন্যান্য",
              custom_category: form.customCategory,
              note: form.note,
              address: form.address,
              blood_group: form.bloodGroup,
              birthday: form.birthday,
              photo_url: form.photoUrl,
            },
          );
        } catch { /* non-fatal */ }
      }

      setSubmitted(true);
      toast.success("আপনার তথ্য সফলভাবে সেভ হয়েছে! 💕");
    } catch (err: any) {
      if (err?.message?.includes("DUPLICATE_USER_ENTRY") || err?.message?.includes("duplicate") || err?.code === "23505") {
        toast.error("এই নম্বরটি আপনি ইতিমধ্যে যুক্ত করেছেন! 📱 'আমার তথ্য' থেকে আপডেট করুন।");
      } else {
        toast.error("তথ্য সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToChat = async () => {
    if (chatReady) {
      navigate("/chat");
      return;
    }
    if (!savedProfile || !form.secretCode.trim()) {
      navigate("/me");
      return;
    }
    setChatLoading(true);
    try {
      const session = await createChatSession(savedProfile.phone, form.secretCode.trim());
      if (session) {
        setChatReady(true);
        navigate("/chat");
      } else {
        toast.error("চ্যাট সেশন তৈরি করা যায়নি। 'আমার তথ্য' থেকে চেষ্টা করুন।");
        navigate("/me");
      }
    } catch {
      toast.error("চ্যাট সেশন তৈরি করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setChatLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setChatReady(false);
    setSavedProfile(null);
    setStep(1);
    setForm({ name: "", email: "", facebook: "", category: "", customCategory: "", note: "", address: "", bloodGroup: "", birthday: "", secretCode: "", photoUrl: "" });
    setPhones([{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }]);
  };

  if (submitted && savedProfile) {
    const hasSecret = !!form.secretCode.trim();
    const maskedPhone = savedProfile.phone.length > 5
      ? savedProfile.phone.slice(0, 3) + "****" + savedProfile.phone.slice(-2)
      : savedProfile.phone;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
          className="heirloom-seal-outer mb-5 flex h-16 w-16 items-center justify-center rounded-full p-1"
        >
          <div className="heirloom-seal-inner flex h-full w-full items-center justify-center rounded-full">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--heirloom-gold-deep))]" />
          </div>
        </motion.div>

        <h2 className="mb-1 text-xl md:text-2xl font-display font-semibold text-foreground">
          স্বাগতম, {savedProfile.name.split(" ")[0]}! 💕
        </h2>
        <p className="mb-6 text-sm text-muted-foreground max-w-sm">
          আপনার তথ্য সফলভাবে সংরক্ষিত হয়েছে। এখান থেকেই আপনি এডমিনকে মেসেজ করতে বা নিজের তথ্য এডিট করতে পারবেন।
        </p>

        {/* Profile preview card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="heirloom-chip w-full rounded-sm border p-4 mb-5"
        >
          <div className="flex items-center gap-4 text-left">
            {savedProfile.photoUrl ? (
              <img
                src={savedProfile.photoUrl}
                alt={savedProfile.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-[hsl(var(--heirloom-gold))]/50"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold))]/40 bg-[hsl(var(--heirloom-bg))] font-display text-xl text-[hsl(var(--heirloom-ink))]">
                {savedProfile.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-[hsl(var(--heirloom-ink))] truncate">{savedProfile.name}</p>
              <p className="text-xs text-[hsl(var(--heirloom-ink-mute))] truncate">{maskedPhone} · {savedProfile.category}</p>
            </div>
          </div>
        </motion.div>

        {/* Primary actions */}
        <div className="w-full space-y-3">
          <Button
            onClick={handleGoToChat}
            variant="heirloom"
            size="lg"
            className="w-full gap-2 h-12 rounded-sm"
            disabled={chatLoading || (!hasSecret && !chatReady)}
          >
            <MessageCircle className="h-4 w-4" />
            {chatLoading ? "চ্যাট খুলছে..." : "এডমিনকে মেসেজ করুন"}
            {!chatLoading && <ArrowRight className="h-4 w-4 ml-auto" />}
          </Button>

          <Button
            onClick={() => navigate("/me")}
            variant="heirloomGhost"
            size="lg"
            className="w-full gap-2 h-12 rounded-sm"
          >
            <Pencil className="h-4 w-4 text-[hsl(var(--heirloom-gold-deep))]" />
            আমার তথ্য দেখুন ও এডিট করুন
            <ArrowRight className="h-4 w-4 ml-auto text-[hsl(var(--heirloom-gold-deep))]" />
          </Button>
        </div>

        {!hasSecret && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-accent/50 p-3 text-left">
            <Shield className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
            <p className="text-xs text-accent-foreground">
              আপনি সিক্রেট কোড দেননি, তাই সরাসরি মেসেজ পাঠানো যাচ্ছে না। ভবিষ্যতে চ্যাট ও এডিটের জন্য 'আমার তথ্য' থেকে OTP দিয়ে সিক্রেট কোড যোগ করে নিন।
            </p>
          </div>
        )}

        <button
          onClick={resetForm}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          আরেকজনের তথ্য যোগ করুন
        </button>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Compact step indicator with active label — replaces the old info box */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(s)}
                aria-label={`ধাপ ${s}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                  s === step
                    ? "bg-[hsl(var(--heirloom-gold-deep))] text-[hsl(var(--heirloom-bg))] shadow-[0_2px_8px_hsl(var(--heirloom-gold-deep)/0.35)]"
                    : s < step
                    ? "bg-[hsl(var(--heirloom-gold))]/25 text-[hsl(var(--heirloom-gold-deep))]"
                    : "bg-[hsl(var(--heirloom-line))]/40 text-[hsl(var(--heirloom-ink-mute))]"
                }`}
              >
                {s}
              </button>
              {s < 3 && <div className={`h-0.5 w-8 rounded ${s < step ? "bg-[hsl(var(--heirloom-gold))]/60" : "bg-[hsl(var(--heirloom-line))]"}`} />}
            </div>
          ))}
        </div>
        <p className="text-[11px] tracking-wide text-[hsl(var(--heirloom-ink-mute))]">
          ধাপ {step} / ৩ · {step === 1 ? "মূল তথ্য" : step === 2 ? "অতিরিক্ত তথ্য" : "সিক্রেট কোড"}
        </p>
      </div>


      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
            <div className="flex justify-center">
              <PhotoUpload value={form.photoUrl || undefined} onChange={(url) => updateForm("photoUrl", url || "")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))]" /> আপনার নাম *</Label>
              <Input id="name" placeholder="আপনার পূর্ণ নাম" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="bg-card" />
            </div>

            <PhoneWithMessengers phones={phones} onChange={setPhones} />

            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5 text-blue-600" /> ফেসবুক</Label>
              <Input id="facebook" placeholder="ফেসবুক প্রোফাইল লিংক বা ইউজারনেম" value={form.facebook} onChange={(e) => updateForm("facebook", e.target.value)} className="bg-card" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))]" /> ইমেইল</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="bg-card" />
            </div>
            <Button onClick={() => { if (!form.name.trim() || !phones[0]?.number.trim()) { toast.error("নাম এবং ফোন নম্বর আবশ্যক"); return; } setStep(2); }} className="w-full" variant="heirloom" size="lg">পরবর্তী ধাপ →</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
            <p className="text-center text-xs italic text-[hsl(var(--heirloom-ink-mute))]">এই ধাপের সব তথ্য ঐচ্ছিক — যতটুকু দরকার ততটুকুই দিন।</p>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">সম্পর্ক/ক্যাটাগরি</Label>
              <Select value={form.category} onValueChange={(v) => updateForm("category", v)}>
                <SelectTrigger className="bg-card"><SelectValue placeholder="ক্যাটাগরি বাছুন" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {form.category === "অন্যান্য" && (
              <div className="space-y-2">
                <Label>নিজের সম্পর্ক লিখুন</Label>
                <Input placeholder="যেমন: মেন্টর, ডাক্তার..." value={form.customCategory} onChange={(e) => updateForm("customCategory", e.target.value)} className="bg-card" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))]" /> ঠিকানা</Label>
              <Input id="address" placeholder="আপনার ঠিকানা" value={form.address} onChange={(e) => updateForm("address", e.target.value)} className="bg-card" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Droplets className="h-3.5 w-3.5 text-red-500" /> রক্তের গ্রুপ</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => updateForm("bloodGroup", v)}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="রক্তের গ্রুপ" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))]" /> জন্মদিন</Label>
                <Input type="date" value={form.birthday} onChange={(e) => updateForm("birthday", e.target.value)} className="bg-card" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">শর্ট নোট</Label>
              <Textarea placeholder="যেকোনো গুরুত্বপূর্ণ তথ্য লিখুন..." value={form.note} onChange={(e) => updateForm("note", e.target.value)} className="bg-card min-h-[80px]" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="heirloomGhost" className="flex-1 rounded-sm">← আগের ধাপ</Button>
              <Button onClick={() => setStep(3)} variant="heirloom" className="flex-1">পরবর্তী ধাপ →</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
            <p className="text-center text-xs italic text-[hsl(var(--heirloom-ink-mute))]">
              ভবিষ্যতে নিজে তথ্য এডিট করতে ছোট কিন্তু মনে রাখার মতো কোড দিন — ডাকনাম, বিশেষ শব্দ বা সংখ্যা+অক্ষরের মিশ্রণ।
            </p>

            <div className="space-y-2">
              <Label htmlFor="secretCode" className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))]" /> সিক্রেট কোড</Label>
              <Input id="secretCode" placeholder="আপনার গোপন কোড (যেমন: জন্মতারিখ, নিকনেম)" value={form.secretCode} onChange={(e) => updateForm("secretCode", e.target.value)} className="bg-card" />
            </div>
            <AnimatePresence>
              {(showSecretWarning || !form.secretCode) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-3 heirloom-chip rounded-sm border p-4">
                    <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                    <p className="text-sm text-accent-foreground">
                      আপনি সিক্রেট কোড না দিলে পরবর্তীতে নিজে তথ্য আপডেট করতে পারবেন না। তখন তথ্য আপডেট করতে অ্যাডমিনকে জানাতে হবে। 🙏
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="heirloomGhost" className="flex-1 rounded-sm">← আগের ধাপ</Button>
              <Button onClick={handleSubmit} variant="heirloom" className="flex-1" disabled={loading}>
                <Heart className="h-4 w-4 mr-1" /> {loading ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
