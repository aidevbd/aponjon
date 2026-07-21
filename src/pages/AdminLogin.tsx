import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { adminLogin, getSession } from "@/lib/store";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rawNext = params.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const afterLogin = nextPath ?? "/admin/dashboard";

  useEffect(() => {
    getSession().then((session) => {
      if (session) navigate(afterLogin, { replace: true });
    });
  }, [navigate, afterLogin]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("ইমেইল এবং পাসওয়ার্ড দিন");
      return;
    }
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("স্বাগতম, অ্যাডমিন! 🎉");
      navigate(afterLogin, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "লগইন ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-app flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />

      <main className="relative flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:py-10">
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
                  অ্যাডমিন লগইন
                </h1>

                <div aria-hidden className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

                <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px]">
                  আপনজন ডাইরেক্টরিতে প্রবেশ করুন।
                </p>
              </div>

              <div className="mx-auto mt-10 w-full max-w-[420px] space-y-5 sm:mt-8">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm text-[hsl(var(--heirloom-ink-soft))]">
                    ইমেইল
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="heirloom-input w-full rounded-sm border px-4 py-3 text-[15px] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm text-[hsl(var(--heirloom-ink-soft))]">
                    পাসওয়ার্ড
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="আপনার পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="heirloom-input w-full rounded-sm border px-4 py-3 text-[15px] outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="heirloom-btn-primary flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300 disabled:opacity-60 sm:text-base"
                >
                  {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
                </button>

                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[hsl(var(--heirloom-ink-soft))] underline-offset-4 transition-colors hover:text-[hsl(var(--heirloom-gold-deep))] hover:underline"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </Link>
                </div>
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
