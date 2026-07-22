import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Smartphone, ShieldCheck, LogOut, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getChatSession, clearChatSession, listChatSessions, revokeChatSession,
  revokeAllOtherChatSessions, revokeAllChatSessions, trustCurrentChatSession,
  getDeviceLabel,
  type ActiveChatSession,
} from "@/lib/chatSession";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এইমাত্র";
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  return `${d} দিন আগে`;
}

function isMobileLabel(label: string | null) {
  if (!label) return false;
  return /Android|iOS/i.test(label);
}

/**
 * Active chat sessions manager — shown on /me for verified end-users.
 * Lists every active login for this contact and lets them revoke individually,
 * revoke all others, or sign out of every device.
 */
export function ActiveSessionsCard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getChatSession());
  const [rows, setRows] = useState<ActiveChatSession[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [trusting, setTrusting] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [labelInput, setLabelInput] = useState("");

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const list = await listChatSessions(session.token);
      setRows(list);
    } catch {
      toast.error("সেশনের তথ্য আনতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const openTrustDialog = () => {
    const current = rows?.find((r) => r.is_current);
    setLabelInput(current?.device_label || getDeviceLabel());
    setTrustOpen(true);
  };

  const handleTrust = async () => {
    if (!session) return;
    setTrusting(true);
    try {
      const exp = await trustCurrentChatSession(session.token, labelInput.trim() || undefined);
      if (exp) {
        toast.success("এই ডিভাইস ৩০ দিনের জন্য মনে রাখা হলো");
        setSession(getChatSession());
        setTrustOpen(false);
        await load();
      } else {
        toast.error("সম্ভব হয়নি, আবার চেষ্টা করুন");
      }
    } finally {
      setTrusting(false);
    }
  };




  if (!session) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">সক্রিয় ডিভাইস</h3>
        <p className="text-xs text-muted-foreground">
          চ্যাট সেশন সক্রিয় নেই। চ্যাটে ঢুকলে এখানে ডিভাইসের তালিকা দেখা যাবে।
        </p>
      </div>
    );
  }

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeChatSession(session.token, id);
      toast.success("ডিভাইস সাইন-আউট হয়েছে");
      await load();
    } catch {
      toast.error("সাইন-আউট করতে সমস্যা হয়েছে");
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const n = await revokeAllOtherChatSessions(session.token);
      toast.success(n > 0 ? `${n}টি ডিভাইস সাইন-আউট হয়েছে` : "অন্য কোনো ডিভাইস ছিল না");
      await load();
    } catch {
      toast.error("সাইন-আউট করতে সমস্যা হয়েছে");
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAllChatSessions(session.token);
      clearChatSession();
      toast.success("সব ডিভাইস থেকে সাইন-আউট হয়েছে");
      navigate("/", { replace: true });
    } catch {
      toast.error("সাইন-আউট করতে সমস্যা হয়েছে");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">সক্রিয় ডিভাইস</h3>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          aria-label="রিফ্রেশ"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {session && !session.trusted && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-foreground/80">
              এই ডিভাইসে সাইন-ইন থাকা শেষ হবে ২৪ ঘণ্টায়। চাইলে ৩০ দিনের জন্য মনে রাখতে পারেন।
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={trusting}
            onClick={handleTrust}
            className="shrink-0 text-xs"
          >
            {trusting ? <Loader2 className="h-3 w-3 animate-spin" /> : "৩০ দিন মনে রাখুন"}
          </Button>
        </div>
      )}


      {loading && !rows ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> লোড হচ্ছে…
        </div>
      ) : rows && rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r) => {
            const Icon = isMobileLabel(r.device_label) ? Smartphone : Monitor;
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{r.device_label || "অজানা ডিভাইস"}</span>
                    {r.is_current && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        এই ডিভাইস
                      </span>
                    )}
                    {r.trusted_device && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-2.5 w-2.5" /> ৩০ দিন
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    শেষ সক্রিয়: {timeAgo(r.last_used_at)}
                  </div>
                </div>
                {!r.is_current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => handleRevoke(r.id)}
                    className="h-8 shrink-0 text-xs text-destructive hover:text-destructive"
                  >
                    {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "সাইন-আউট"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground py-2">কোনো সক্রিয় সেশন নেই।</p>
      )}

      {rows && rows.length > 1 && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                অন্য সব ডিভাইস সাইন-আউট
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>অন্য সব ডিভাইস থেকে সাইন-আউট?</AlertDialogTitle>
                <AlertDialogDescription>
                  এই ডিভাইস ছাড়া বাকি সব ডিভাইস তৎক্ষণাৎ সাইন-আউট হবে। আবার ঢুকতে সিক্রেট কোড দিতে হবে।
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>বাতিল</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevokeOthers}>করুন</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {rows && rows.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-destructive/80 hover:text-destructive">
              <LogOut className="h-3 w-3" /> সব ডিভাইস থেকে সাইন-আউট
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>সব ডিভাইস থেকে সাইন-আউট?</AlertDialogTitle>
              <AlertDialogDescription>
                এই ডিভাইসসহ সব জায়গা থেকে সাইন-আউট হবেন। চ্যাট করতে আবার যাচাই করতে হবে।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevokeAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                সব থেকে সাইন-আউট
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
