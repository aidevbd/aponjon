import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Facebook, Lock, Mail, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneWithMessengers } from "@/components/PhoneWithMessengers";
import { PhotoUpload } from "@/components/PhotoUpload";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { emptyAddContactPayload, type AddContactPayload } from "@/components/admin/adminContactTypes";

interface Props {
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: AddContactPayload) => void;
}

export function ContactAddModal({ submitting, onClose, onSubmit }: Props) {
  const uid = useId();
  const aid = (k: string) => `${uid}-${k}`;
  const [form, setForm] = useState<AddContactPayload>(emptyAddContactPayload);
  const patch = (p: Partial<AddContactPayload>) => setForm((f) => ({ ...f, ...p }));

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
            <Plus className="h-4 w-4 text-primary" /> নতুন কন্টাক্ট
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="যোগ বন্ধ করুন" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-center">
            <PhotoUpload value={form.photoUrl || undefined} onChange={(url) => patch({ photoUrl: url || "" })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={aid("name")} className="text-xs">নাম *</Label>
            <Input id={aid("name")} value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="পূর্ণ নাম" className="bg-card h-9" />
          </div>
          <PhoneWithMessengers phones={form.phones} onChange={(phones) => patch({ phones })} />
          <div className="space-y-1.5">
            <Label htmlFor={aid("facebook")} className="text-xs flex items-center gap-1.5"><Facebook className="h-3 w-3 text-blue-600" /> ফেসবুক</Label>
            <Input id={aid("facebook")} value={form.facebook} onChange={(e) => patch({ facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={aid("email")} className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> ইমেইল</Label>
            <Input id={aid("email")} value={form.email} onChange={(e) => patch({ email: e.target.value })} type="email" className="bg-card h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={aid("category")} className="text-xs">ক্যাটাগরি</Label>
            <Select value={form.category} onValueChange={(v) => patch({ category: v })}>
              <SelectTrigger id={aid("category")} className="bg-card h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          {form.category === "অন্যান্য" && (
            <div className="space-y-1.5">
              <Label htmlFor={aid("customCategory")} className="text-xs">কাস্টম ক্যাটাগরি</Label>
              <Input id={aid("customCategory")} value={form.customCategory} onChange={(e) => patch({ customCategory: e.target.value })} className="bg-card h-9" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={aid("address")} className="text-xs">ঠিকানা</Label>
            <Input id={aid("address")} value={form.address} onChange={(e) => patch({ address: e.target.value })} className="bg-card h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={aid("blood")} className="text-xs">রক্তের গ্রুপ</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => patch({ bloodGroup: v })}>
                <SelectTrigger id={aid("blood")} className="bg-card h-9"><SelectValue placeholder="রক্তের গ্রুপ" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={aid("birthday")} className="text-xs">জন্মদিন</Label>
              <Input id={aid("birthday")} type="date" value={form.birthday} onChange={(e) => patch({ birthday: e.target.value })} className="bg-card h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={aid("note")} className="text-xs">নোট</Label>
            <Textarea id={aid("note")} value={form.note} onChange={(e) => patch({ note: e.target.value })} className="bg-card min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={aid("secretCode")} className="text-xs flex items-center gap-1.5"><Lock className="h-3 w-3 text-primary" /> সিক্রেট কোড (ঐচ্ছিক)</Label>
            <Input id={aid("secretCode")} value={form.secretCode} onChange={(e) => patch({ secretCode: e.target.value })} placeholder="গোপন কোড" className="bg-card h-9" />
          </div>
        </div>
        <Button onClick={() => onSubmit(form)} disabled={submitting} variant="hero" className="w-full mt-4 h-9">
          <Plus className="h-4 w-4 mr-1" /> {submitting ? "যোগ হচ্ছে..." : "কন্টাক্ট যোগ করুন"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
