import { useEffect, useState } from "react";
import { Bell, Volume2, Vibrate } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  notifyNewMessage,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const supportsVibration = typeof navigator !== "undefined" && typeof (navigator as any).vibrate === "function";

export function NotificationPreferencesDialog({ open, onOpenChange }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());

  useEffect(() => {
    if (open) setPrefs(getNotificationPrefs());
  }, [open]);

  const update = (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setNotificationPrefs(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> নোটিফিকেশন সেটিংস
          </DialogTitle>
          <DialogDescription className="text-xs">
            নতুন মেসেজ এলে সাউন্ড ও ভাইব্রেশন চালু/বন্ধ রাখুন। এই সেটিং এই ডিভাইসে সেভ থাকবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-3 cursor-pointer">
            <div className="flex items-center gap-3 min-w-0">
              <Volume2 className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">সাউন্ড</div>
                <div className="text-[11px] text-muted-foreground">নতুন মেসেজ এলে ছোট চাইম বাজবে</div>
              </div>
            </div>
            <Switch checked={prefs.sound} onCheckedChange={(v) => update({ sound: v })} />
          </label>

          <label
            className={`flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-3 ${supportsVibration ? "cursor-pointer" : "opacity-60"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Vibrate className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">ভাইব্রেশন</div>
                <div className="text-[11px] text-muted-foreground">
                  {supportsVibration ? "মোবাইলে সংক্ষিপ্ত ভাইব্রেশন" : "এই ডিভাইসে সাপোর্ট নেই"}
                </div>
              </div>
            </div>
            <Switch
              checked={prefs.vibration && supportsVibration}
              disabled={!supportsVibration}
              onCheckedChange={(v) => update({ vibration: v })}
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => notifyNewMessage()}>
            টেস্ট করুন
          </Button>
          <Button variant="hero" size="sm" onClick={() => onOpenChange(false)}>
            সম্পন্ন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
