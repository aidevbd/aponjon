import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = window.location.hash;

        // 0) Check if there's already a valid session BEFORE touching the code
        // (prevents "code already used" on refresh)
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          if (mounted) setReady(true);
          if (code || hash.includes("access_token")) {
            window.history.replaceState({}, "", window.location.pathname);
          }
          return;
        }

        // 1) Handle modern PKCE flow: ?code=...
        if (code) {
          const { data: ex, error: exErr } =
            await supabase.auth.exchangeCodeForSession(code);
          window.history.replaceState({}, "", window.location.pathname);
          if (exErr) throw exErr;
          if (ex.session && mounted) {
            setReady(true);
            return;
          }
        }

        // 2) Handle legacy implicit flow: #access_token=...&type=recovery
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { data: setData, error: setErr } =
              await supabase.auth.setSession({ access_token, refresh_token });
            window.history.replaceState({}, "", window.location.pathname);
            if (setErr) throw setErr;
            if (setData.session && mounted) {
              setReady(true);
              return;
            }
          }
        }

        // 3) Nothing worked — wait briefly for onAuthStateChange (PASSWORD_RECOVERY)
        setTimeout(async () => {
          if (!mounted) return;
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setReady(true);
          } else {
            setError(
              "রিসেট লিংক অবৈধ অথবা মেয়াদ শেষ হয়ে গেছে। নতুন লিংক রিকুয়েস্ট করুন।"
            );
          }
        }, 1500);
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "লিংক যাচাই ব্যর্থ হয়েছে");
        }
      }
    };

    // Listen for PASSWORD_RECOVERY event as well
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        if (mounted) {
          setReady(true);
          setError(null);
        }
      }
    });

    init();

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (password !== confirm) {
      toast.error("দুইটি পাসওয়ার্ড মিলছে না");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("পাসওয়ার্ড আপডেট হয়েছে! 🎉");
      await supabase.auth.signOut();
      navigate("/admin");
    } catch (err: any) {
      toast.error(err?.message || "আপডেট ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen warm-gradient">
      <Header />
      <main className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-sm"
        >
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full hero-gradient shadow-rose">
                <KeyRound className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                নতুন পাসওয়ার্ড সেট করুন
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {error
                  ? "ত্রুটি ঘটেছে"
                  : ready
                  ? "নতুন পাসওয়ার্ড দিন"
                  : "লিংক যাচাই হচ্ছে..."}
              </p>
            </div>

            {error && (
              <div className="space-y-4 text-center">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                  <p className="text-sm">{error}</p>
                </div>
                <Button
                  onClick={() => navigate("/forgot-password")}
                  variant="hero"
                  className="w-full"
                >
                  নতুন রিসেট লিংক চান
                </Button>
                <Button
                  onClick={() => navigate("/admin")}
                  variant="ghost"
                  className="w-full"
                >
                  লগইনে ফিরুন
                </Button>
              </div>
            )}

            {ready && !error && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" /> নতুন পাসওয়ার্ড
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">পাসওয়ার্ড নিশ্চিত করুন</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="আবার লিখুন"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    className="bg-card"
                  />
                </div>
                <Button
                  onClick={handleReset}
                  variant="hero"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "আপডেট হচ্ছে..." : "পাসওয়ার্ড আপডেট করুন"}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPassword;
