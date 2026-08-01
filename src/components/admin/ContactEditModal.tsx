import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { Edit3, Facebook, Heart, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneWithMessengers, parseMessengersToPhones, type PhoneEntry } from "@/components/PhoneWithMessengers";
import { PhotoUpload } from "@/components/PhotoUpload";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import type { ContactRow } from "@/lib/store";

interface Props {
  contact: ContactRow;
  onClose: () => void;
  onSave: (form: Partial<ContactRow>, phones: PhoneEntry[]) => void;
}

export function ContactEditModal({ contact, onClose, onSave }: Props) {
  const uid = useId();
  const eid = (k: string) => `${uid}-${k}`;
  const [form, setForm] = useState<Partial<ContactRow>>(contact);
  const [phones, setPhones] = useState<PhoneEntry[]>(
    parseMessengersToPhones(contact.phone, contact.whatsapp, contact.imo, contact.telegram),
  );

  useEffect(() => {
    setForm(contact);
    setPhones(parseMessengersToPhones(contact.phone, contact.whatsapp, contact.imo, contact.telegram));
  }, [contact]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-5 w-full max-w-md md:max-w-xl lg:max-w-2xl max-h-[85dvh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-display font-semibold flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" /> তথ্য সম্পাদনা
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="সম্পাদনা বন্ধ করুন" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-center">
            <PhotoUpload value={form.photo_url || undefined} onChange={(url) => setForm({ ...form, photo_url: url || null })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={eid("name")} className="text-xs">নাম</Label>
            <Input id={eid("name")} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-card h-9" />
          </div>
          <PhoneWithMessengers phones={phones} onChange={setPhones} firstPhoneReadOnly={false} />
          <div className="space-y-1.5">
            <Label htmlFor={eid("facebook")} className="text-xs flex items-center gap-1.5"><Facebook className="h-3 w-3 text-blue-600" /> ফেসবুক</Label>
            <Input id={eid("facebook")} value={form.facebook || ""} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={eid("email")} className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> ইমেইল</Label>
            <Input id={eid("email")} type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-card h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={eid("category")} className="text-xs">ক্যাটাগরি</Label>
            <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id={eid("category")} className="bg-card h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={eid("address")} className="text-xs">ঠিকানা</Label>
            <Input id={eid("address")} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-card h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={eid("blood")} className="text-xs">রক্তের গ্রুপ</Label>
              <Select value={form.blood_group || ""} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                <SelectTrigger id={eid("blood")} className="bg-card h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={eid("birthday")} className="text-xs">জন্মদিন</Label>
              <Input id={eid("birthday")} type="date" value={form.birthday || ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="bg-card h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={eid("note")} className="text-xs">নোট</Label>
            <Textarea id={eid("note")} value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className="bg-card min-h-[60px]" />
          </div>
        </div>
        <Button onClick={() => onSave(form, phones)} variant="hero" className="w-full mt-4 h-9">
          <Heart className="h-4 w-4 mr-1" /> সেভ করুন
        </Button>
      </motion.div>
    </motion.div>
  );
}
