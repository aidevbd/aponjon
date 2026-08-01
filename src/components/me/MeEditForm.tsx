import { Facebook, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhoneWithMessengers, PhoneEntry } from "@/components/PhoneWithMessengers";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";

type Props = {
  form: any;
  setForm: (v: any) => void;
  phones: PhoneEntry[];
  setPhones: (v: PhoneEntry[]) => void;
  saving: boolean;
  fid: (k: string) => string;
  onCancel: () => void;
  onSave: () => void;
};

export function MeEditForm({ form, setForm, phones, setPhones, saving, fid, onCancel, onSave }: Props) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">তথ্য আপডেট করুন</h2>
        <button
          onClick={onCancel}
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
          <Label htmlFor={fid("name")}>নাম</Label>
          <Input id={fid("name")} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background" />
        </div>
        <PhoneWithMessengers phones={phones} onChange={setPhones} firstPhoneReadOnly />
        <div className="space-y-2">
          <Label htmlFor={fid("facebook")} className="flex items-center gap-2">
            <Facebook className="h-3.5 w-3.5 text-blue-600" /> ফেসবুক
          </Label>
          <Input
            id={fid("facebook")}
            value={form.facebook || ""}
            onChange={(e) => setForm({ ...form, facebook: e.target.value })}
            className="bg-background"
            placeholder="প্রোফাইল লিংক বা ইউজারনেম"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fid("email")}>ইমেইল</Label>
          <Input id={fid("email")} type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fid("category")}>ক্যাটাগরি</Label>
          <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger id={fid("category")} className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={fid("address")}>ঠিকানা</Label>
          <Input id={fid("address")} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-background" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={fid("blood")}>রক্তের গ্রুপ</Label>
            <Select value={form.blood_group || ""} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
              <SelectTrigger id={fid("blood")} className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fid("birthday")}>জন্মদিন</Label>
            <Input id={fid("birthday")} type="date" value={form.birthday || ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="bg-background" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={fid("note")}>নোট</Label>
          <Textarea id={fid("note")} value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className="bg-background min-h-[80px]" />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={onCancel} variant="outline" className="flex-1 h-12 rounded-xl">বাতিল</Button>
        <Button onClick={onSave} className="flex-1 gap-2 h-12 rounded-xl" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </Button>
      </div>
    </>
  );
}
