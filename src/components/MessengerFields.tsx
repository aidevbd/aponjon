import { MessageCircle, Send, Video, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MessengerFieldsProps {
  phone: string;
  whatsapp: string;
  imo: string;
  telegram: string;
  onChange: (field: "whatsapp" | "imo" | "telegram", value: string) => void;
}

export function MessengerFields({ phone, whatsapp, imo, telegram, onChange }: MessengerFieldsProps) {
  const copyPhone = (field: "whatsapp" | "imo" | "telegram") => {
    onChange(field, phone);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-green-500" /> WhatsApp
        </Label>
        <div className="flex gap-2">
          <Input value={whatsapp} onChange={(e) => onChange("whatsapp", e.target.value)} placeholder="WhatsApp নম্বর" className="bg-card" />
          {phone && (
            <Button type="button" variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => copyPhone("whatsapp")} title="ফোন নম্বর কপি করুন">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Video className="h-3.5 w-3.5 text-blue-500" /> IMO
        </Label>
        <div className="flex gap-2">
          <Input value={imo} onChange={(e) => onChange("imo", e.target.value)} placeholder="IMO নম্বর" className="bg-card" />
          {phone && (
            <Button type="button" variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => copyPhone("imo")} title="ফোন নম্বর কপি করুন">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Send className="h-3.5 w-3.5 text-sky-500" /> Telegram
        </Label>
        <div className="flex gap-2">
          <Input value={telegram} onChange={(e) => onChange("telegram", e.target.value)} placeholder="Telegram নম্বর" className="bg-card" />
          {phone && (
            <Button type="button" variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => copyPhone("telegram")} title="ফোন নম্বর কপি করুন">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
