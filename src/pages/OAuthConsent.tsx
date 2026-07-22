import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertTriangle, Check, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: any;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};

function oauth(): SupabaseOAuth {
  // The auth.oauth namespace is beta and not always in the generated types.
  return (supabase.auth as any).oauth as SupabaseOAuth;
}

/**
 * Heirloom-themed OAuth consent surface. Same paper/corner-ornament shell as
 * Verify / AddContact so the trust boundary feels like the rest of the app.
 */
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("এই লিঙ্কে authorization_id নেই।");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/admin?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Authorization server কোনো redirect URL ফিরিয়ে দেয়নি।");
      return;
    }
    window.location.href = target;
  }

  // Shared heirloom paper shell
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-app flex-col bg-[hsl(var(--heirloom-bg))]">
      <main className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-lg">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10"
          >
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />
            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />
            <div className="relative">{children}</div>
          </motion.article>
        </div>
      </main>
    </div>
  );

  if (error) {
    return (
      <Shell>
        <div className="text-center">
          <div aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="mt-4 font-display text-2xl leading-tight text-[hsl(var(--heirloom-ink))] sm:text-3xl">
            অনুমোদন সম্পন্ন হয়নি
          </h1>
          <div aria-hidden className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />
          <p className="mt-4 text-[14px] leading-[1.7] text-[hsl(var(--heirloom-ink-soft))] sm:text-[15px]">
            {error}
          </p>
        </div>
      </Shell>
    );
  }

  if (!details) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--heirloom-gold-deep))]" />
          <p className="mt-4 text-sm text-[hsl(var(--heirloom-ink-soft))]">অনুরোধ পড়া হচ্ছে…</p>
        </div>
      </Shell>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "একটি অ্যাপ";

  const permissions = [
    "আপনার বেসিক প্রোফাইল ও ইমেইল দেখতে পারবে",
    "আপনজনের চালু করা টুল (কন্টাক্ট দেখা, খোঁজা) কল করতে পারবে",
    "অ্যাপের নিরাপত্তা নীতি সবসময় বজায় থাকবে",
  ];

  return (
    <Shell>
      <div className="text-center">
        <div aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.5)] bg-[hsl(var(--heirloom-gold)/0.08)]">
          <ShieldCheck className="h-5 w-5 text-[hsl(var(--heirloom-gold-deep))]" />
        </div>
        <h1 className="mt-4 font-display text-2xl leading-tight text-[hsl(var(--heirloom-ink))] sm:text-3xl">
          অনুমতি চাইছে
        </h1>
        <div aria-hidden className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />
        <p className="mt-4 text-[14px] leading-[1.7] text-[hsl(var(--heirloom-ink-soft))] sm:text-[15px]">
          <span className="font-medium text-[hsl(var(--heirloom-ink))]">{clientName}</span>{" "}
          আপনার আপনজন অ্যাকাউন্টের সাথে যুক্ত হতে চাইছে
        </p>
      </div>

      <div className="mt-7 rounded-sm border border-[hsl(var(--heirloom-gold)/0.3)] bg-[hsl(var(--heirloom-gold)/0.05)] p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wider text-[hsl(var(--heirloom-ink-soft))]">
          অনুমতি দিলে
        </p>
        <ul className="mt-3 space-y-2.5">
          {permissions.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[14px] leading-[1.6] text-[hsl(var(--heirloom-ink))]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--heirloom-gold-deep))]" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-[hsl(var(--heirloom-ink-soft))]">
        <Dot className="-ml-1 h-4 w-4 shrink-0 text-[hsl(var(--heirloom-gold-deep))]" />
        অনুমোদন যেকোনো সময় প্রত্যাহার করা যাবে। আপনার অ্যাডমিন অনুমতির বাইরে কোনো তথ্য ভাগ হবে না।
      </p>

      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse">
        <Button
          variant="heirloom"
          className="w-full sm:flex-1"
          onClick={() => decide(true)}
          disabled={busy}
        >
          {busy ? "অপেক্ষা করুন…" : "অনুমোদন করুন"}
        </Button>
        <Button
          variant="outline"
          className="w-full sm:flex-1"
          onClick={() => decide(false)}
          disabled={busy}
        >
          বাতিল
        </Button>
      </div>
    </Shell>
  );
}
