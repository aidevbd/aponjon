import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Lock, Phone, Shield, Edit3, ArrowLeft, Heart, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { verifyContactByPhone, verifySecretCode, verifyAndGetContact, updateVerifiedContact, generateOtp, verifyOtp } from "@/lib/store";
import { toast } from "sonner";

type AccessStep = "choose" | "phone-input" | "secret-input" | "verify-phone" | "otp-input" | "edit";

export function AccessForm() {
  const [step, setStep] = useState<AccessStep>("choose");
  const [phoneInput, setPhoneInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [maskedContacts, setMaskedContacts] = useState<{ id: string; masked_phone: string }[]>([]);
  const [fullPhoneInput, setFullPhoneInput] = useState("");
  const [currentContact, setCurrentContact] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [noSecretCode, setNoSecretCode] = useState(false);

  const handlePhoneSubmit = async () => {
    setLoading(true);
    try {
      const result = await verifyContactByPhone(phoneInput);
      if (!result || result.id === null) {
        if (result?.rate_limited) {
          toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন। 🔒");
          return;
        }
        toast.error("এই নম্বরে কোনো তথ্য পাওয়া যায়নি");
        return;
      }
      if (!result.has_secret_code) {
        setNoSecretCode(true);
        setOtpPhone(phoneInput);
        // OTP generation - for now show message about SMS
        toast.info("সিক্রেট কোড সেট করা হয়নি। OTP ভেরিফিকেশন প্রয়োজন।");
        
        const otpResult = await generateOtp(phoneInput);
        if (otpResult === "RATE_LIMITED") {
          toast.error("অনেকবার চেষ্টা করেছেন। পরে আবার চেষ্টা করুন। 🔒");
          return;
        }
        if (otpResult === "DAILY_LIMIT") {
          toast.error("আজকের জন্য OTP সীমা শেষ। আগামীকাল আবার চেষ্টা করুন।");
          return;
        }
        // In production, OTP would be sent via SMS. For now, show it in toast for testing.
        toast.info(`🔑 আপনার OTP: ${otpResult} (টেস্টিং মোড — প্রোডাকশনে SMS এ যাবে)`);
        setStep("otp-input");
        return;
      }
      toast.info("আপনার সিক্রেট কোড দিন");
      setStep("secret-input");
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    setLoading(true);
    try {
      const result = await verifyOtp(otpPhone, otpCode);
      if (result) {
        // OTP verified - get contact data (we need admin-level access for this)
        // For OTP-verified users, we'll let them edit limited fields
        toast.success("OTP ভেরিফিকেশন সফল! 🎉");
        // Since no secret code, we need a different approach to get contact
        // We'll use verifyAndGetContact with a special flow
        // For now, redirect to a simplified edit
        const { data } = await (await import("@/integrations/supabase/client")).supabase
          .from("contacts_public")
          .select("*")
          .eq("phone", otpPhone)
          .single();
        if (data) {
          setCurrentContact(data);
          setEditForm(data);
          setStep("edit");
        } else {
          toast.error("তথ্য পাওয়া যায়নি");
        }
      } else {
        toast.error("OTP কোড ভুল হয়েছে");
      }
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleSecretSubmit = async () => {
    setLoading(true);
    try {
      if (step === "secret-input" && phoneInput) {
        const contact = await verifyAndGetContact(phoneInput, secretInput);
        if (!contact || contact.id === null) {
          if (contact?.rate_limited) {
            toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন। 🔒");
            return;
          }
          toast.error("সিক্রেট কোড ভুল হয়েছে");
          return;
        }
        setCurrentContact(contact);
        setEditForm(contact);
        setStep("edit");
        toast.success("ভেরিফিকেশন সফল! 🎉");
        return;
      }

      const contacts = await verifySecretCode(secretInput);
      if (contacts.length === 0 || contacts[0].id === null) {
        if (contacts[0]?.rate_limited) {
          toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন। 🔒");
          return;
        }
        toast.error("এই সিক্রেট কোডে কোনো তথ্য পাওয়া যায়নি");
        return;
      }

      setMaskedContacts(contacts);
      setStep("verify-phone");
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setLoading(true);
    try {
      const contact = await verifyAndGetContact(fullPhoneInput, secretInput);
      if (contact && contact.id !== null) {
        if (contact.rate_limited) {
          toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন। 🔒");
          return;
        }
        setCurrentContact(contact);
        setEditForm(contact);
        setStep("edit");
        toast.success("ভেরিফিকেশন সফল! 🎉");
      } else {
        toast.error("নম্বরটি মিলছে না");
      }
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      if (noSecretCode) {
        // OTP-verified users - update via direct table (need RPC or admin)
        // For now use the contacts_public approach
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.from("contacts").update({
          name: editForm.name,
          whatsapp: editForm.whatsapp,
          imo: editForm.imo,
          email: editForm.email,
          category: editForm.category,
          custom_category: editForm.custom_category,
          note: editForm.note,
          address: editForm.address,
          blood_group: editForm.blood_group,
          birthday: editForm.birthday,
        }).eq("id", currentContact.id);
        if (error) throw error;
      } else {
        const phone = currentContact.phone;
        await updateVerifiedContact(phone, secretInput, {
          name: editForm.name,
          whatsapp: editForm.whatsapp,
          imo: editForm.imo,
          email: editForm.email,
          category: editForm.category,
          custom_category: editForm.custom_category,
          note: editForm.note,
          address: editForm.address,
          blood_group: editForm.blood_group,
          birthday: editForm.birthday,
        });
      }
      toast.success("তথ্য সফলভাবে আপডেট হয়েছে! 💕");
      resetAll();
    } catch {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep("choose");
    setPhoneInput("");
    setSecretInput("");
    setMaskedContacts([]);
    setFullPhoneInput("");
    setCurrentContact(null);
    setEditForm({});
    setOtpCode("");
    setOtpPhone("");
    setNoSecretCode(false);
  };

  return (
    <div className="mx-auto max-w-lg">
      <AnimatePresence mode="wait">
        {step === "choose" && (
          <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground">আপনার তথ্য এক্সেস করুন</h2>
              <p className="text-sm text-muted-foreground mt-1">ফোন নম্বর অথবা সিক্রেট কোড দিয়ে শুরু করুন</p>
            </div>
            <Button onClick={() => setStep("phone-input")} variant="outline" size="lg" className="w-full justify-start gap-3 h-14">
              <Phone className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">ফোন নম্বর দিয়ে</div>
                <div className="text-xs text-muted-foreground">আপনার রেজিস্টার্ড নম্বর দিন</div>
              </div>
            </Button>
            <Button onClick={() => { setPhoneInput(""); setStep("secret-input"); }} variant="outline" size="lg" className="w-full justify-start gap-3 h-14">
              <Lock className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">সিক্রেট কোড দিয়ে</div>
                <div className="text-xs text-muted-foreground">আপনার গোপন কোড দিন</div>
              </div>
            </Button>
          </motion.div>
        )}

        {step === "phone-input" && (
          <motion.div key="phone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <button onClick={resetAll} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> পেছনে যান
            </button>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> আপনার ফোন নম্বর</Label>
              <Input placeholder="01XXXXXXXXX" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="bg-card" />
            </div>
            <Button onClick={handlePhoneSubmit} variant="hero" className="w-full" disabled={loading}>{loading ? "যাচাই হচ্ছে..." : "পরবর্তী →"}</Button>
          </motion.div>
        )}

        {step === "secret-input" && (
          <motion.div key="secret" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <button onClick={resetAll} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> পেছনে যান
            </button>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-primary" /> সিক্রেট কোড</Label>
              <Input type="password" placeholder="আপনার সিক্রেট কোড" value={secretInput} onChange={(e) => setSecretInput(e.target.value)} className="bg-card" />
            </div>
            <Button onClick={handleSecretSubmit} variant="hero" className="w-full" disabled={loading}>{loading ? "যাচাই হচ্ছে..." : "ভেরিফাই করুন"}</Button>
          </motion.div>
        )}

        {step === "otp-input" && (
          <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <button onClick={resetAll} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> পেছনে যান
            </button>
            <div className="rounded-xl bg-accent/50 p-4 border border-accent">
              <div className="flex gap-2 items-start">
                <KeyRound className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-accent-foreground">OTP পাঠানো হয়েছে</p>
                  <p className="text-xs text-muted-foreground mt-1">আপনার ফোনে পাঠানো ৬ সংখ্যার কোডটি দিন</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 text-primary" /> OTP কোড</Label>
              <Input placeholder="৬ সংখ্যার কোড" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="bg-card text-center text-lg tracking-widest" maxLength={6} />
            </div>
            <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">প্রতিদিন সর্বোচ্চ ১টি OTP পাওয়া যাবে। ৫ মিনিটের মধ্যে ব্যবহার করুন।</p>
            </div>
            <Button onClick={handleOtpSubmit} variant="hero" className="w-full" disabled={loading}>{loading ? "যাচাই হচ্ছে..." : "ভেরিফাই করুন"}</Button>
          </motion.div>
        )}

        {step === "verify-phone" && (
          <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <button onClick={resetAll} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> পেছনে যান
            </button>
            <div className="rounded-xl bg-accent/50 p-4 border border-accent">
              <p className="text-sm font-medium text-accent-foreground mb-2">আপনার নম্বর পাওয়া গেছে:</p>
              {maskedContacts.map((mc) => (
                <p key={mc.id} className="text-sm text-muted-foreground font-mono">{mc.masked_phone}</p>
              ))}
            </div>
            <div className="space-y-2">
              <Label>সম্পূর্ণ ফোন নম্বর লিখুন</Label>
              <Input placeholder="01XXXXXXXXX" value={fullPhoneInput} onChange={(e) => setFullPhoneInput(e.target.value)} className="bg-card" />
            </div>
            <Button onClick={handleVerifyPhone} variant="hero" className="w-full" disabled={loading}>{loading ? "যাচাই হচ্ছে..." : "ভেরিফাই করুন"}</Button>
          </motion.div>
        )}

        {step === "edit" && currentContact && (
          <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <button onClick={resetAll} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> পেছনে যান
            </button>
            <div className="text-center mb-4">
              <Edit3 className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-display font-semibold">তথ্য আপডেট করুন</h3>
            </div>
            <div className="space-y-4">
              <PhotoUpload
                currentPhotoUrl={editForm.photo_url || null}
                onPhotoUploaded={(url) => setEditForm({ ...editForm, photo_url: url })}
                onPhotoRemoved={() => setEditForm({ ...editForm, photo_url: null })}
              />
              <div className="space-y-2"><Label>নাম</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card" /></div>
              <div className="space-y-2"><Label>WhatsApp</Label><Input value={editForm.whatsapp || ""} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} className="bg-card" /></div>
              <div className="space-y-2"><Label>IMO</Label><Input value={editForm.imo || ""} onChange={(e) => setEditForm({ ...editForm, imo: e.target.value })} className="bg-card" /></div>
              <div className="space-y-2"><Label>ইমেইল</Label><Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-card" /></div>
              <div className="space-y-2">
                <Label>ক্যাটাগরি</Label>
                <Select value={editForm.category || ""} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>ঠিকানা</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>রক্তের গ্রুপ</Label>
                  <Select value={editForm.blood_group || ""} onValueChange={(v) => setEditForm({ ...editForm, blood_group: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>জন্মদিন</Label><Input type="date" value={editForm.birthday || ""} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} className="bg-card" /></div>
              </div>
              <div className="space-y-2"><Label>নোট</Label><Textarea value={editForm.note || ""} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="bg-card" /></div>
            </div>
            <Button onClick={handleSaveEdit} variant="hero" className="w-full" disabled={loading}>
              <Heart className="h-4 w-4 mr-1" /> {loading ? "আপডেট হচ্ছে..." : "আপডেট সেভ করুন"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
