import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Plus, Trash2, MessageCircle, Video, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface PhoneEntry {
  number: string;
  hasWhatsApp: boolean;
  hasIMO: boolean;
  hasTelegram: boolean;
}

interface PhoneWithMessengersProps {
  phones: PhoneEntry[];
  onChange: (phones: PhoneEntry[]) => void;
  maxPhones?: number;
  /** If true, first phone is editable (for add forms). If false, first phone is read-only (for edit forms where phone is fixed). */
  firstPhoneReadOnly?: boolean;
}

/** Derive messenger comma-separated strings from phone entries */
export function deriveMessengers(phones: PhoneEntry[]) {
  const whatsapp = phones.filter(p => p.hasWhatsApp && p.number.trim()).map(p => p.number.trim()).join(", ") || null;
  const imo = phones.filter(p => p.hasIMO && p.number.trim()).map(p => p.number.trim()).join(", ") || null;
  const telegram = phones.filter(p => p.hasTelegram && p.number.trim()).map(p => p.number.trim()).join(", ") || null;
  return { whatsapp, imo, telegram };
}

/** Parse stored messenger strings back into phone entries for editing */
export function parseMessengersToPhones(
  primaryPhone: string,
  whatsapp?: string | null,
  imo?: string | null,
  telegram?: string | null
): PhoneEntry[] {
  const waList = (whatsapp || "").split(",").map(s => s.trim()).filter(Boolean);
  const imoList = (imo || "").split(",").map(s => s.trim()).filter(Boolean);
  const telList = (telegram || "").split(",").map(s => s.trim()).filter(Boolean);

  // Collect all unique numbers, primary first
  const allNums = new Set<string>();
  allNums.add(primaryPhone);
  [...waList, ...imoList, ...telList].forEach(n => allNums.add(n));

  const entries: PhoneEntry[] = [];
  allNums.forEach(num => {
    entries.push({
      number: num,
      hasWhatsApp: waList.includes(num),
      hasIMO: imoList.includes(num),
      hasTelegram: telList.includes(num),
    });
  });

  return entries.length > 0 ? entries : [{ number: primaryPhone, hasWhatsApp: false, hasIMO: false, hasTelegram: false }];
}

export function PhoneWithMessengers({ phones, onChange, maxPhones = 3, firstPhoneReadOnly = false }: PhoneWithMessengersProps) {
  const updatePhone = (index: number, updates: Partial<PhoneEntry>) => {
    onChange(phones.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const addPhone = () => {
    if (phones.length < maxPhones) {
      onChange([...phones, { number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }]);
    }
  };

  const removePhone = (index: number) => {
    if (phones.length > 1) {
      onChange(phones.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <Phone className="h-3.5 w-3.5 text-primary" /> মোবাইল নম্বর
      </Label>
      {phones.map((phone, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card/50 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Input
              placeholder={index === 0 ? "01XXXXXXXXX (প্রধান নম্বর)" : "অতিরিক্ত নম্বর"}
              value={phone.number}
              onChange={(e) => updatePhone(index, { number: e.target.value })}
              className="bg-card"
              readOnly={index === 0 && firstPhoneReadOnly}
            />
            {index > 0 && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive shrink-0" aria-label="নম্বর সরান" onClick={() => removePhone(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pl-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={phone.hasWhatsApp}
                onCheckedChange={(checked) => updatePhone(index, { hasWhatsApp: !!checked })}
              />
              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-600 font-medium">WhatsApp</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={phone.hasIMO}
                onCheckedChange={(checked) => updatePhone(index, { hasIMO: !!checked })}
              />
              <Video className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-blue-500 font-medium">IMO</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={phone.hasTelegram}
                onCheckedChange={(checked) => updatePhone(index, { hasTelegram: !!checked })}
              />
              <Send className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-sky-500 font-medium">Telegram</span>
            </label>
          </div>
        </motion.div>
      ))}
      {phones.length < maxPhones && (
        <Button variant="outline" size="sm" onClick={addPhone} className="w-full gap-2 text-muted-foreground">
          <Plus className="h-4 w-4" /> আরেকটি নম্বর যোগ করুন
        </Button>
      )}
    </div>
  );
}
