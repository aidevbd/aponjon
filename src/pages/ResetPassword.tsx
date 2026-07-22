import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          if (mounted) setReady(true);
          if (code || hash.includes("access_token")) {
            window.history.replaceState({}, "", window.location.pathname);
          }
          return;
        }

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

  const subtitle = error
    ? "লিংকটিতে সমস্যা হয়েছে।"
    : ready
    ? "নতুন পাসওয়ার্ড দিন — সাবধানে রাখবেন।"
    : "লিংক যাচাই হচ্ছে...";

  return (
    <div className="flex min-h-app flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />

      <main id="main-content" className="relative flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:py-10">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10 md:p-12 lg:p-12"
          >
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />

            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <h1 className="mt-8 font-display text-3xl leading-[1.15] tracking-tight text-[hsl(var(--heirloom-ink))] sm:mt-10 sm:text-4xl md:text-5xl">
                  নতুন পাসওয়ার্ড
                </h1>

                <div aria-hidden className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

                <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px]">
                  {subtitle}
                </p>
              </div>

              <div className="mx-auto mt-10 w-full max-w-[420px] space-y-5 sm:mt-8">
                {error && (
                  <>
                    <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-4 text-center text-[14px] leading-[1.6] text-destructive">
                      {error}
                    </p>
                    <button
                      onClick={() => navigate("/forgot-password")}
                      className="heirloom-btn-primary flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300"
                    >
                      নতুন রিসেট লিংক চান
                    </button>
                    <button
                      onClick={() => navigate("/admin")}
                      className="heirloom-btn-ghost flex w-full items-center justify-center gap-2 rounded-sm border px-5 py-3 text-[14px] font-medium transition-all duration-300"
                    >
                      লগইনে ফিরুন
                    </button>
                  </>
                )}

                {ready && !error && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm text-[hsl(var(--heirloom-ink-soft))]">
                        নতুন পাসওয়ার্ড
                      </label>
                      <input
                        id="password"
                        type="password"
                        placeholder="কমপক্ষে ৬ অক্ষর"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="heirloom-input w-full rounded-sm border px-4 py-3 text-[15px] outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm" className="block text-sm text-[hsl(var(--heirloom-ink-soft))]">
                        পাসওয়ার্ড নিশ্চিত করুন
                      </label>
                      <input
                        id="confirm"
                        type="password"
                        placeholder="আবার লিখুন"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                        className="heirloom-input w-full rounded-sm border px-4 py-3 text-[15px] outline-none"
                      />
                    </div>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="heirloom-btn-primary flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300 disabled:opacity-60 sm:text-base"
                    >
                      {loading ? "আপডেট হচ্ছে..." : "পাসওয়ার্ড আপডেট করুন"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
