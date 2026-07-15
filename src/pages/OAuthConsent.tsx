import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Heart, ShieldCheck } from "lucide-react";
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

  if (error) {
    return (
      <div className="min-h-screen warm-gradient flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-display font-semibold mb-2">Authorization ব্যর্থ</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen warm-gradient flex items-center justify-center">
        <Heart className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "একটি অ্যাপ";

  return (
    <div className="min-h-screen warm-gradient flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full hero-gradient shadow-rose">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-semibold">{clientName} কে সংযুক্ত করুন</h1>
            <p className="text-xs text-muted-foreground">আপনজন অ্যাকাউন্টের সাথে</p>
          </div>
        </div>

        <p className="text-sm text-foreground/80 mb-4">
          <strong>{clientName}</strong> আপনার হয়ে আপনজনের চালু করা টুলগুলো ব্যবহার করতে পারবে।
          আপনার অ্যাডমিন-স্তরের অনুমতি অনুযায়ী কেবল অনুমোদিত ডেটাই ব্যবহার করা যাবে।
        </p>

        <ul className="text-sm text-foreground/80 mb-6 space-y-1 list-disc pl-5">
          <li>আপনার বেসিক প্রোফাইল ও ইমেইল শেয়ার হবে</li>
          <li>আপনজনের চালু করা টুল (কন্টাক্ট দেখা, খোঁজা) কল করা যাবে</li>
          <li>অ্যাপের নিরাপত্তা নীতি বজায় থাকবে</li>
        </ul>

        <div className="flex gap-3">
          <Button variant="hero" className="flex-1" onClick={() => decide(true)} disabled={busy}>
            অনুমোদন করুন
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => decide(false)} disabled={busy}>
            বাতিল
          </Button>
        </div>
      </div>
    </div>
  );
}
