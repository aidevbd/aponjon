import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Smartphone, Tablet, ShieldCheck, LogOut, Loader2, RefreshCw, Chrome, Globe, MapPin, Clock, ChevronDown } from "lucide-react";
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
import { SessionsListSkeleton } from "@/components/skeletons/LoadingSkeletons";
import {
  getChatSession, clearChatSession, listChatSessions, revokeChatSession,
  revokeAllOtherChatSessions, revokeAllChatSessions, trustCurrentChatSession,
  getDeviceLabel,
  type ActiveChatSession,
} from "@/lib/chatSession";
import { lookupIpGeo, countryFlag, formatIpGeoShort, type IpGeo } from "@/lib/ipGeo";

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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("bn-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Compact user-agent string — trims common noise so it fits in one line. */
function shortenUA(ua: string | null): string {
  if (!ua) return "";
  return ua
    .replace(/Mozilla\/[\d.]+\s*/i, "")
    .replace(/\(KHTML,\s*like Gecko\)\s*/i, "")
    .replace(/AppleWebKit\/[\d.]+\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a User-Agent string into a friendly label like
 * "iPhone · Safari" / "Windows PC · Chrome" / "Android মোবাইল · Chrome"
 * Returns null if UA is empty.
 */
function parseUAFriendly(ua: string | null): { device: string; browser: string; label: string } | null {
  if (!ua) return null;

  // Browser (order matters)
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR\/|Opera\//i.test(ua) ? "Opera" :
    /SamsungBrowser\//i.test(ua) ? "Samsung Internet" :
    /FxiOS\//i.test(ua) ? "Firefox" :
    /CriOS\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Safari\//i.test(ua) ? "Safari" :
    "ব্রাউজার";

  // Device
  let device = "ডিভাইস";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/iPod/i.test(ua)) device = "iPod";
  else if (/Android/i.test(ua)) {
    device = /Mobile/i.test(ua) ? "Android মোবাইল" : "Android ট্যাবলেট";
  } else if (/Windows/i.test(ua)) device = "Windows PC";
  else if (/Macintosh|Mac OS X/i.test(ua)) device = "Mac";
  else if (/CrOS/i.test(ua)) device = "Chromebook";
  else if (/Linux/i.test(ua)) device = "Linux";

  return { device, browser, label: `${device} · ${browser}` };
}


/** Parse a device label (either "Chrome · Android মোবাইল" or free-form) into a device icon. */
function pickDeviceIcon(label: string | null) {
  const l = (label || "").toLowerCase();
  if (/ট্যাবলেট|tablet|ipad/.test(l)) return Tablet;
  if (/মোবাইল|mobile|phone|android|iphone|ios/.test(l)) return Smartphone;
  return Monitor;
}

/** Pick a browser glyph; Chrome gets its own icon, everything else uses a globe. */
function pickBrowserIcon(label: string | null) {
  const l = (label || "").toLowerCase();
  if (/chrome/.test(l) && !/chromeos/.test(l)) return Chrome;
  return Globe;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [geoMap, setGeoMap] = useState<Record<string, IpGeo | null>>({});

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

  // Resolve city/country for each unique IP in the list.
  useEffect(() => {
    if (!rows) return;
    const ips = Array.from(new Set(rows.map((r) => r.ip_address).filter((x): x is string => !!x)));
    const missing = ips.filter((ip) => !(ip in geoMap));
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (ip) => {
        const g = await lookupIpGeo(ip);
        return [ip, g] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setGeoMap((prev) => {
        const next = { ...prev };
        for (const [ip, g] of pairs) next[ip] = g;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="pb-3">
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
    <div className="pb-3">
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={load}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          aria-label="রিফ্রেশ"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {session && !session.trusted && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[hsl(var(--heirloom-gold)/0.35)] bg-[hsl(var(--heirloom-gold)/0.08)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--heirloom-gold-deep))]" />
            <p className="text-xs leading-relaxed text-[hsl(var(--heirloom-ink-soft))]">
              এই ডিভাইসে সাইন-ইন থাকা শেষ হবে ২৪ ঘণ্টায়। চাইলে ৩০ দিনের জন্য মনে রাখতে পারেন।
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={trusting}
            onClick={openTrustDialog}
            className="shrink-0 text-xs border-[hsl(var(--heirloom-gold)/0.4)] text-[hsl(var(--heirloom-gold-deep))] hover:bg-[hsl(var(--heirloom-gold)/0.12)]"
          >
            ৩০ দিন মনে রাখুন
          </Button>
        </div>
      )}



      {loading && !rows ? (
        <SessionsListSkeleton rows={2} />
      ) : rows && rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((r) => {
            const DeviceIcon = pickDeviceIcon(r.device_label);
            const BrowserIcon = pickBrowserIcon(r.device_label);
            const isOpen = expandedId === r.id;
            
            const uaFriendly = parseUAFriendly(r.user_agent);

            return (
              <li key={r.id} className="rounded-lg border border-border/60 bg-background/60">
                <div className="flex items-start gap-3 p-3">
                  <div className="relative mt-0.5 shrink-0">
                    <DeviceIcon className="h-6 w-6 text-primary" />
                    <BrowserIcon className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-card p-[1px] text-muted-foreground ring-1 ring-border" />
                  </div>
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
                    {uaFriendly && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate" title={r.user_agent || undefined}>
                        {uaFriendly.label}
                      </div>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeAgo(r.last_used_at)}
                      </span>
                      {r.ip_address && (() => {
                        const geo = geoMap[r.ip_address];
                        const loc = formatIpGeoShort(geo);
                        return (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {loc ? (
                              <>
                                {geo?.country_code && (
                                  <span aria-hidden className="text-sm leading-none">
                                    {countryFlag(geo.country_code)}
                                  </span>
                                )}
                                <span>{loc}</span>
                              </>
                            ) : (
                              <span className="font-mono">{r.ip_address}</span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : r.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      aria-expanded={isOpen}
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      {isOpen ? "কম দেখুন" : "বিস্তারিত"}
                    </button>
                  </div>
                  {!r.is_current && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === r.id}
                          className="h-8 shrink-0 text-xs text-destructive hover:text-destructive"
                        >
                          {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "সাইন-আউট"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <LogOut className="h-5 w-5" />
                          </div>
                          <AlertDialogTitle className="text-center">এই ডিভাইস সাইন-আউট করবেন?</AlertDialogTitle>
                          <AlertDialogDescription className="text-center">
                            "{r.device_label || "অজানা ডিভাইস"}" থেকে তৎক্ষণাৎ সাইন-আউট হবে। আবার ঢুকতে সিক্রেট কোড দিতে হবে।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(r.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            সাইন-আউট
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                {isOpen && (
                  <div className="space-y-3 border-t border-[hsl(var(--heirloom-gold)/0.2)] bg-[hsl(var(--heirloom-gold)/0.04)] px-3.5 py-3">
                    {/* Time */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--heirloom-gold-deep))]/80">
                        <Clock className="h-2.5 w-2.5" />
                        <span>সময়</span>
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                        <dt className="text-muted-foreground">প্রথম সাইন-ইন</dt>
                        <dd className="text-foreground text-right sm:text-left">{formatDateTime(r.created_at)}</dd>
                        <dt className="text-muted-foreground">সেশন শেষ হবে</dt>
                        <dd className="text-foreground text-right sm:text-left">{formatDateTime(r.expires_at)}</dd>
                      </dl>
                    </div>

                    {/* Network */}
                    {r.ip_address && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--heirloom-gold-deep))]/80">
                          <MapPin className="h-2.5 w-2.5" />
                          <span>নেটওয়ার্ক</span>
                        </div>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                          {(() => {
                            const geo = geoMap[r.ip_address];
                            const loc = formatIpGeoShort(geo);
                            return loc ? (
                              <>
                                <dt className="text-muted-foreground">অবস্থান</dt>
                                <dd className="text-foreground text-right sm:text-left">
                                  {geo?.country_code && (
                                    <span aria-hidden className="mr-1">{countryFlag(geo.country_code)}</span>
                                  )}
                                  {loc}
                                </dd>
                              </>
                            ) : null;
                          })()}
                          <dt className="text-muted-foreground">IP</dt>
                          <dd className="font-mono text-foreground/80 text-right sm:text-left break-all">{r.ip_address}</dd>
                        </dl>
                      </div>
                    )}

                    {/* Device */}
                    {uaFriendly && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--heirloom-gold-deep))]/80">
                          <Monitor className="h-2.5 w-2.5" />
                          <span>ডিভাইস</span>
                        </div>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                          <dt className="text-muted-foreground">সিস্টেম</dt>
                          <dd className="text-foreground text-right sm:text-left">{uaFriendly.device}</dd>
                          <dt className="text-muted-foreground">ব্রাউজার</dt>
                          <dd className="text-foreground text-right sm:text-left">{uaFriendly.browser}</dd>
                        </dl>
                      </div>
                    )}
                  </div>
                )}


              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground py-2">কোনো সক্রিয় সেশন নেই।</p>
      )}

      {rows && rows.length > 1 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="group mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-2.5 text-left transition hover:border-destructive/40 hover:bg-destructive/5"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition group-hover:bg-destructive/15">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-foreground">
                    অন্য সব ডিভাইস সাইন-আউট
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    এই ডিভাইস ছাড়া বাকি {rows.length - 1}টি সেশন বাতিল হবে
                  </span>
                </span>
              </span>
              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-destructive">›</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LogOut className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-center">অন্য সব ডিভাইস থেকে সাইন-আউট?</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                এই ডিভাইস ছাড়া বাকি সব ডিভাইস তৎক্ষণাৎ সাইন-আউট হবে। আবার ঢুকতে সিক্রেট কোড দিতে হবে।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeOthers}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                সাইন-আউট করুন
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* "সব ডিভাইস থেকে সাইন-আউট" সরানো হয়েছে — /me পেজের নিচের সাইন-আউট বাটনই এই ডিভাইস সামলায়,
          এবং একাধিক ডিভাইস থাকলে "অন্য সব ডিভাইস সাইন-আউট" দিয়ে বাকিগুলো সামলানো যায়। */}

      <Dialog open={trustOpen} onOpenChange={(o) => !trusting && setTrustOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>এই ডিভাইসকে ৩০ দিনের জন্য মনে রাখুন</DialogTitle>
            <DialogDescription>
              সক্রিয় ডিভাইসের তালিকায় সহজে চেনার জন্য একটি নাম দিন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="device-label" className="text-xs">
              ডিভাইসের নাম
            </Label>
            <Input
              id="device-label"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value.slice(0, 40))}
              placeholder="যেমন: আমার ফোন, অফিস ল্যাপটপ"
              maxLength={40}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !trusting) {
                  e.preventDefault();
                  void handleTrust();
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              খালি রাখলে স্বয়ংক্রিয় নাম ব্যবহার হবে ({getDeviceLabel()})।
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setTrustOpen(false)} disabled={trusting}>
              বাতিল
            </Button>
            <Button onClick={handleTrust} disabled={trusting}>
              {trusting ? <Loader2 className="h-4 w-4 animate-spin" /> : "নিশ্চিত করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

