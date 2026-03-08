import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Phone, Shield, Edit3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contact, CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { getContacts, findContactByPhone, findContactsBySecretCode, maskPhone, updateContact } from "@/lib/store";
import { toast } from "sonner";

type AccessStep = "choose" | "phone-input" | "secret-input" | "verify-phone" | "edit";

export function AccessForm() {
  const [step, setStep] = useState<AccessStep>("choose");
  const [phoneInput, setPhoneInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [maskedContacts, setMaskedContacts] = useState<{ id: string; maskedPhone: string }[]>([]);
  const [fullPhoneInput, setFullPhoneInput] = useState("");
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});

  const handlePhoneSubmit = () => {
    const contact = findContactByPhone(phoneInput);
    if (!contact) {
      toast.error("এই নম্বরে কোনো তথ্য পাওয়া যায়নি");
      return;
    }
    if (!contact.secretCode) {
      toast.error("এই নম্বরে সিক্রেট কোড সেট করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।");
      return;
    }
    toast.info("আপনার সিক্রেট কোড দিন");
    setStep("secret-input");
  };

  const handleSecretSubmit = () => {
    if (step === "secret-input" && phoneInput) {
      const contact = findContactByPhone(phoneInput);
      if (contact && contact.secretCode === secretInput) {
        setCurrentContact(contact);
        setEditForm(contact);
        setStep("edit");
        toast.success("ভেরিফিকেশন সফল! 🎉");
      } else {
        toast.error("সিক্রেট কোড ভুল হয়েছে");
      }
      return;
    }

    // Secret code first flow
    const contacts = findContactsBySecretCode(secretInput);
    if (contacts.length === 0) {
      toast.error("এই সিক্রেট কোডে কোনো তথ্য পাওয়া যায়নি");
      return;
    }

    setMaskedContacts(contacts.map((c) => ({ id: c.id, maskedPhone: maskPhone(c.phone) })));
    setStep("verify-phone");
  };

  const handleVerifyPhone = () => {
    const allContacts = getContacts();
    const matched = allContacts.find(
      (c) => c.phone === fullPhoneInput && c.secretCode === secretInput
    );
    if (matched) {
      setCurrentContact(matched);
      setEditForm(matched);
      setStep("edit");
      toast.success("ভেরিফিকেশন সফল! 🎉");
    } else {
      toast.error("নম্বরটি মিলছে না");
    }
  };

  const handleSaveEdit = () => {
    if (currentContact) {
      updateContact(currentContact.id, editForm);
      toast.success("তথ্য সফলভাবে আপডেট হয়েছে! 💕");
      setStep("choose");
      setCurrentContact(null);
      setPhoneInput("");
      setSecretInput("");
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
            <Button onClick={handlePhoneSubmit} variant="hero" className="w-full">পরবর্তী →</Button>
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
            <Button onClick={handleSecretSubmit} variant="hero" className="w-full">ভেরিফাই করুন</Button>
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
                <p key={mc.id} className="text-sm text-muted-foreground font-mono">{mc.maskedPhone}</p>
              ))}
            </div>
            <div className="space-y-2">
              <Label>সম্পূর্ণ ফোন নম্বর লিখুন</Label>
              <Input placeholder="01XXXXXXXXX" value={fullPhoneInput} onChange={(e) => setFullPhoneInput(e.target.value)} className="bg-card" />
            </div>
            <Button onClick={handleVerifyPhone} variant="hero" className="w-full">ভেরিফাই করুন</Button>
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
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={editForm.whatsapp || ""} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label>IMO</Label>
                <Input value={editForm.imo || ""} onChange={(e) => setEditForm({ ...editForm, imo: e.target.value })} className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label>ইমেইল</Label>
                <Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label>ক্যাটাগরি</Label>
                <Select value={editForm.category || ""} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ঠিকানা</Label>
                <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>রক্তের গ্রুপ</Label>
                  <Select value={editForm.bloodGroup || ""} onValueChange={(v) => setEditForm({ ...editForm, bloodGroup: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>জন্মদিন</Label>
                  <Input type="date" value={editForm.birthday || ""} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} className="bg-card" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>নোট</Label>
                <Textarea value={editForm.note || ""} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="bg-card" />
              </div>
            </div>

            <Button onClick={handleSaveEdit} variant="hero" className="w-full">
              <Heart className="h-4 w-4 mr-1" /> আপডেট সেভ করুন
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
