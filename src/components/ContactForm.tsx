import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Phone, MessageCircle, Mail, MapPin, Droplets, Calendar, Lock, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { saveContact } from "@/lib/store";
import { PhotoUpload } from "@/components/PhotoUpload";
import { toast } from "sonner";

export function ContactForm() {
  const [step, setStep] = useState(1);
  const [showSecretWarning, setShowSecretWarning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    imo: "",
    email: "",
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
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("নাম এবং ফোন নম্বর আবশ্যক");
      return;
    }

    setLoading(true);
    try {
      await saveContact({
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        imo: form.imo,
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
      setSubmitted(true);
      toast.success("আপনার তথ্য সফলভাবে সেভ হয়েছে! 💕");
    } catch (err: any) {
      if (err?.message?.includes("duplicate") || err?.message?.includes("unique") || err?.code === "23505") {
        toast.error("এই ফোন নম্বরটি আগেই যুক্ত করা হয়েছে! 📱 অন্য নম্বর দিয়ে চেষ্টা করুন অথবা 'আমার তথ্য' থেকে আপডেট করুন।");
      } else {
        toast.error("তথ্য সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </motion.div>
        <h2 className="mb-2 text-2xl font-display font-semibold text-foreground">ধন্যবাদ! 💕</h2>
        <p className="mb-6 text-muted-foreground max-w-md">আপনার তথ্য সফলভাবে আপনজন ডাইরেক্টরিতে যুক্ত হয়েছে। আপনি আমাদের কাছে গুরুত্বপূর্ণ!</p>
        <Button variant="outline" onClick={() => { setSubmitted(false); setStep(1); setForm({ name: "", phone: "", whatsapp: "", imo: "", email: "", category: "", customCategory: "", note: "", address: "", bloodGroup: "", birthday: "", secretCode: "", photoUrl: "" }); }}>
          আরেকজনের তথ্য যোগ করুন
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(s)} className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${s === step ? "hero-gradient text-primary-foreground shadow-rose" : s < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {s}
            </button>
            {s < 3 && <div className={`h-0.5 w-8 rounded ${s < step ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
            <div className="text-center mb-6">
              <h3 className="text-lg font-display font-semibold text-foreground">মূল তথ্য</h3>
              <p className="text-sm text-muted-foreground">আপনার নাম ও যোগাযোগের তথ্য দিন</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-primary" /> আপনার নাম *</Label>
              <Input id="name" placeholder="আপনার পূর্ণ নাম" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="bg-card" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> মোবাইল নম্বর *</Label>
              <Input id="phone" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} className="bg-card" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5 text-green-600" /> WhatsApp</Label>
                <Input id="whatsapp" placeholder="WhatsApp নম্বর" value={form.whatsapp} onChange={(e) => updateForm("whatsapp", e.target.value)} className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imo" className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-blue-500" /> IMO</Label>
                <Input id="imo" placeholder="IMO নম্বর" value={form.imo} onChange={(e) => updateForm("imo", e.target.value)} className="bg-card" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> ইমেইল</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="bg-card" />
            </div>
            <Button onClick={() => { if (!form.name.trim() || !form.phone.trim()) { toast.error("নাম এবং ফোন নম্বর আবশ্যক"); return; } setStep(2); }} className="w-full" variant="hero" size="lg">পরবর্তী ধাপ →</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
            <div className="text-center mb-6">
              <h3 className="text-lg font-display font-semibold text-foreground">অতিরিক্ত তথ্য</h3>
              <p className="text-sm text-muted-foreground">ক্যাটাগরি ও অন্যান্য বিবরণ</p>
            </div>
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
              <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> ঠিকানা</Label>
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
                <Label className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" /> জন্মদিন</Label>
                <Input type="date" value={form.birthday} onChange={(e) => updateForm("birthday", e.target.value)} className="bg-card" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">শর্ট নোট</Label>
              <Textarea placeholder="যেকোনো গুরুত্বপূর্ণ তথ্য লিখুন..." value={form.note} onChange={(e) => updateForm("note", e.target.value)} className="bg-card min-h-[80px]" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">← আগের ধাপ</Button>
              <Button onClick={() => setStep(3)} variant="hero" className="flex-1">পরবর্তী ধাপ →</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
            <div className="text-center mb-6">
              <h3 className="text-lg font-display font-semibold text-foreground">সিক্রেট কোড (ঐচ্ছিক)</h3>
              <p className="text-sm text-muted-foreground">ভবিষ্যতে নিজের তথ্য এক্সেস করতে</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretCode" className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-primary" /> সিক্রেট কোড</Label>
              <Input id="secretCode" placeholder="আপনার গোপন কোড (যেমন: জন্মতারিখ, নিকনেম)" value={form.secretCode} onChange={(e) => updateForm("secretCode", e.target.value)} className="bg-card" />
            </div>
            <AnimatePresence>
              {(showSecretWarning || !form.secretCode) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-3 rounded-xl bg-accent/60 p-4 border border-accent">
                    <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                    <p className="text-sm text-accent-foreground">
                      আপনি সিক্রেট কোড না দিলে পরবর্তীতে নিজে তথ্য আপডেট করতে পারবেন না। তখন তথ্য আপডেট করতে অ্যাডমিনকে জানাতে হবে। 🙏
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">← আগের ধাপ</Button>
              <Button onClick={handleSubmit} variant="hero" className="flex-1" disabled={loading}>
                <Heart className="h-4 w-4 mr-1" /> {loading ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
