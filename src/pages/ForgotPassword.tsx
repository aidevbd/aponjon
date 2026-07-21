import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error("ইমেইল দিন");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("রিসেট লিংক পাঠানো হয়েছে! 📧");
    } catch (err: any) {
      toast.error(err?.message || "পাঠাতে ব্যর্থ হয়েছে");
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
                  পাসওয়ার্ড ভুলে গেছেন?
                </h1>

                <div aria-hidden className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

                <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px]">
                  {sent
                    ? "ইনবক্স ও Spam ফোল্ডার একটু চেক করে নিন।"
                    : "ইমেইল দিন — রিসেট লিংক পাঠিয়ে দেব।"}
                </p>
              </div>

              <div className="mx-auto mt-10 w-full max-w-[420px] space-y-5 sm:mt-8">
                {sent ? (
                  <>
                    <p className="rounded-sm border border-[hsl(var(--heirloom-gold)/0.3)] bg-[hsl(var(--heirloom-cream)/0.5)] px-4 py-4 text-center text-[15px] leading-[1.6] text-[hsl(var(--heirloom-ink))]">
                      <strong className="text-[hsl(var(--heirloom-gold-deep))]">{email}</strong>
                      <br />
                      ঠিকানায় রিসেট লিংক পাঠানো হয়েছে।
                    </p>
                    <Link
                      to="/admin"
                      className="heirloom-btn-ghost group flex w-full items-center justify-center gap-2 rounded-sm border px-5 py-3.5 text-[15px] font-medium transition-all duration-300"
                    >
                      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden />
                      <span>লগইনে ফিরুন</span>
                    </Link>
                  </>
                ) : (
                  <>
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
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="heirloom-input w-full rounded-sm border px-4 py-3 text-[15px] outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={loading}
                      className="heirloom-btn-primary flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300 disabled:opacity-60 sm:text-base"
                    >
                      {loading ? "পাঠানো হচ্ছে..." : "রিসেট লিংক পাঠান"}
                    </button>

                    <Link
                      to="/admin"
                      className="heirloom-btn-ghost group flex w-full items-center justify-center gap-2 rounded-sm border px-5 py-3 text-[14px] font-medium transition-all duration-300"
                    >
                      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden />
                      <span>লগইনে ফিরুন</span>
                    </Link>
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

export default ForgotPassword;
