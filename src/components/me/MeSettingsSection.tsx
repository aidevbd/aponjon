import { LogOut, ShieldAlert, KeyRound, Monitor, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ActiveSessionsCard } from "@/components/ActiveSessionsCard";

type Props = {
  isOtpAuth: boolean;
  fid: (k: string) => string;
  sessionsOpen: boolean;
  setSessionsOpen: (v: boolean) => void;
  secretOpen: boolean;
  setSecretOpen: (v: boolean) => void;
  closeSecretPanel: () => void;
  newSecret: string;
  setNewSecret: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (fn: (v: boolean) => boolean) => void;
  settingSecret: boolean;
  ackDanger: boolean;
  setAckDanger: (v: boolean) => void;
  onSetSecret: () => void;
  onLogout: () => void;
};

export function MeSettingsSection({
  isOtpAuth, fid, sessionsOpen, setSessionsOpen, secretOpen, setSecretOpen, closeSecretPanel,
  newSecret, setNewSecret, showSecret, setShowSecret, settingSecret, ackDanger, setAckDanger,
  onSetSecret, onLogout,
}: Props) {
  return (
    <>
      {/* Section divider */}
      <div className="mt-14 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-heirloom-gold/[0.35] to-heirloom-gold/[0.6]" />
          <div className="flex items-center gap-2 text-heirloom-gold-deep">
            <span className="text-micro opacity-70">✦</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.28em]">সেটিংস</span>
            <span className="text-micro opacity-70">✦</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-heirloom-gold/[0.35] to-heirloom-gold/[0.6]" />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground/90 italic">
          নিরাপত্তা ও সাইন-ইন ব্যবস্থাপনা
        </p>
      </div>

      {/* Active devices */}
      <Collapsible
        open={sessionsOpen}
        onOpenChange={setSessionsOpen}
        className="mb-8 rounded-2xl border border-border/70 bg-card overflow-hidden shadow-heirloom-card"
      >
        <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
            <Monitor className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-medium text-foreground">সক্রিয় ডিভাইস</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              কোন কোন ডিভাইসে সাইন-ইন আছে — দেখুন ও সরান।
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${sessionsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/70 bg-gradient-to-b from-heirloom-gold/[0.03] to-transparent px-4 pt-3 pb-1">
            <ActiveSessionsCard />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sensitive header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <ShieldAlert className="h-3 w-3 text-destructive/70" />
        <span className="text-micro font-medium uppercase tracking-[0.22em] text-destructive/80">সংবেদনশীল</span>
        <div className="h-px flex-1 bg-destructive/20" />
      </div>

      {/* Secret code */}
      <div className={`mb-8 rounded-2xl border border-border/70 overflow-hidden transition-all ${secretOpen
        ? "bg-destructive/[0.04] ring-1 ring-destructive/40 shadow-[0_8px_28px_-16px_hsl(var(--destructive)/0.35)]"
        : "bg-card shadow-heirloom-card"}`}>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${secretOpen
              ? "bg-destructive/10 text-destructive ring-destructive/25"
              : "bg-heirloom-gold-deep/10 text-heirloom-gold-deep ring-heirloom-gold-deep/20"}`}>
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-medium text-foreground">সিক্রেট কোড</h3>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {isOtpAuth
                  ? "অন্য ডিভাইসে সাইন-ইনের জন্য একটি কোড সেট করুন।"
                  : "অন্য ডিভাইসে সাইন-ইনের সময় এই কোডটি লাগবে।"}
              </p>
            </div>
          </div>
          {!secretOpen && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSecretOpen(true)}
              className="rounded-lg shrink-0 border-heirloom-gold-deep/40 text-heirloom-gold-deep hover:bg-heirloom-gold-deep/10"
            >
              {isOtpAuth ? "সেট করুন" : "বদলান"}
            </Button>
          )}
        </div>

        {secretOpen && (
          <div className="px-4 pb-4 space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <div className="text-[12px] leading-relaxed text-destructive">
                  <p className="font-semibold">সতর্কতা — সংবেদনশীল পরিবর্তন</p>
                  <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-destructive/90">
                    <li>নতুন কোড ভুলে গেলে অ্যাকাউন্ট ফিরে পাওয়া কঠিন হবে।</li>
                    <li>পুরনো কোড আর কাজ করবে না — অন্য ডিভাইসে নতুন কোড দিয়েই সাইন-ইন করতে হবে।</li>
                    <li>কোডটি কারো সাথে শেয়ার করবেন না।</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={fid("new-secret")} className="text-xs">নতুন কোড</Label>
              <div className="relative">
                <Input
                  id={fid("new-secret")}
                  type={showSecret ? "text" : "password"}
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  className="bg-background pr-20 font-mono"
                  placeholder="কমপক্ষে ৪ অক্ষর"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute inset-y-0 right-2 my-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showSecret ? "লুকান" : "দেখুন"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                টাইপ করে "দেখুন" চেপে নিশ্চিত হয়ে নিন — কোডটা মনে রাখতে হবে।
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ackDanger}
                onChange={(e) => setAckDanger(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-destructive"
              />
              <span className="text-[12px] leading-relaxed text-foreground/85">
                আমি বুঝেছি — কোড ভুলে গেলে আমার দায়িত্ব, এবং পুরনো কোড আর চলবে না।
              </span>
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={closeSecretPanel} disabled={settingSecret}>
                বাতিল
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1 rounded-lg gap-2"
                onClick={onSetSecret}
                disabled={settingSecret || !newSecret || !ackDanger}
              >
                <KeyRound className="h-4 w-4" />
                {settingSecret ? "রাখা হচ্ছে..." : (isOtpAuth ? "কোডটি সেট করুন" : "কোডটি বদলান")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sign out */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="group w-full rounded-2xl border border-border/70 bg-card p-4 text-left transition hover:border-destructive/40 hover:bg-destructive/[0.03] shadow-heirloom-hairline">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border transition group-hover:bg-destructive/10 group-hover:text-destructive group-hover:ring-destructive/25">
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-medium text-foreground">চলে যাই</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    এই ডিভাইস থেকে সাইন-আউট হবেন।
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:text-destructive group-hover:translate-x-0.5" />
            </div>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-center">সাইন-আউট করবেন?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              এই ডিভাইস থেকে সাইন-আউট হবেন। আবার ঢুকতে ভেরিফাই করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              সাইন-আউট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
