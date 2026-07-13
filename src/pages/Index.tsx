import { motion } from "framer-motion";
import { Heart, UserPlus, Shield, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-border/60 bg-card p-6 shadow-rose sm:max-w-lg sm:p-10"
        >
          {/* Ambient background */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-[hsl(var(--coral))]/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-[hsl(var(--rose-soft))] px-3 py-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-[11px] font-medium tracking-wide text-primary sm:text-xs">
                আসসালামু আলাইকুম 💕
              </span>
            </motion.div>

            {/* Brand mark */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 180 }}
              className="mt-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl hero-gradient shadow-rose sm:h-16 sm:w-16"
            >
              <Heart
                className="h-6 w-6 fill-current text-primary-foreground sm:h-7 sm:w-7"
                aria-hidden
              />
            </motion.div>

            {/* Headline */}
            <h1 className="mt-5 font-display text-[28px] leading-[1.15] tracking-tight text-foreground sm:text-4xl">
              আপনি আমার{" "}
              <span className="italic text-primary">আপনজন</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-3 max-w-[19rem] text-[14px] leading-relaxed text-muted-foreground sm:max-w-sm sm:text-[15px]">
              মোবাইল হারালে যেন আপনাকে হারিয়ে না ফেলি — একটু কষ্ট করে আপনার নাম আর নম্বরটা যোগ করে দেবেন? 🤍
            </p>

            {/* CTAs */}
            <div className="mt-6 flex w-full flex-col gap-2.5 sm:mt-7">
              <Link
                to="/add"
                className="group inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl hero-gradient px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-rose transition-all hover:shadow-lg active:scale-[0.98] sm:text-base"
              >
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  আমার তথ্য যোগ করি
                </span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>

              <Link
                to="/access"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-[hsl(var(--rose-soft))] active:scale-[0.98] sm:text-base"
              >
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                আগে যোগ করেছি, দেখি
              </Link>
            </div>

            {/* Divider */}
            <div className="mt-6 flex w-full items-center gap-3 sm:mt-7">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Aponjon
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Signature */}
            <p className="mt-4 font-display text-sm italic text-primary/80 sm:text-base">
              ইতি, আপনারই একজন আপনজন
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Index;
