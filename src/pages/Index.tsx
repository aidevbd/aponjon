import { motion } from "framer-motion";
import { Heart, UserPlus, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border/60 bg-card shadow-rose"
        >
          <div className="flex flex-col md:flex-row">
            {/* Left visual pane */}
            <div className="relative flex min-h-[280px] w-full flex-col justify-between overflow-hidden bg-[hsl(var(--rose-soft))] p-8 sm:p-10 md:min-h-[560px] md:w-[45%] md:p-14">
              {/* soft glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[hsl(var(--coral))]/15 blur-3xl"
              />

              <div className="relative z-10">
                <div className="mb-6 h-px w-10 bg-primary/60 sm:mb-8 sm:w-12" />
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 180 }}
                  className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full hero-gradient shadow-rose sm:h-16 sm:w-16"
                >
                  <Heart
                    className="h-6 w-6 fill-current text-primary-foreground sm:h-7 sm:w-7 animate-float"
                    aria-hidden
                  />
                </motion.div>
                <h2
                  className="font-display text-6xl italic leading-none text-primary sm:text-7xl md:text-8xl"
                  aria-hidden
                >
                  আপনজন
                </h2>
              </div>

              <div className="relative z-10 mt-8 flex items-end justify-between md:mt-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/80">
                  Personal Directory
                </p>
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 100 100"
                  fill="none"
                  aria-hidden
                  className="opacity-30"
                >
                  <circle cx="50" cy="50" r="48" stroke="hsl(var(--coral))" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="35" stroke="hsl(var(--coral))" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="22" stroke="hsl(var(--coral))" strokeWidth="0.5" />
                </svg>
              </div>
            </div>

            {/* Right content pane */}
            <div className="flex w-full flex-col justify-center p-8 sm:p-10 md:w-[55%] md:p-16">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="mx-auto w-full max-w-md md:mx-0"
              >
                <span className="mb-3 inline-block text-xs font-medium tracking-wide text-primary/90 sm:text-sm">
                  আসসালামু আলাইকুম 💕
                </span>

                <h1 className="mb-6 font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                  আপনি আমার <span className="italic text-primary">আপনজন</span>
                </h1>

                <div className="space-y-3 text-base leading-relaxed text-foreground/85 sm:text-lg">
                  <p>
                    মোবাইল হারালে যেন আপনাকে হারিয়ে না ফেলি — তাই এই ছোট্ট
                    ডাইরেক্টরি।
                  </p>
                  <p>
                    একটু কষ্ট করে আপনার নাম আর নম্বরটা যোগ করে দেবেন? 🤍
                  </p>
                </div>

                <p className="mt-6 font-display text-lg italic text-primary/80 sm:text-xl">
                  ইতি, আপনারই একজন আপনজন
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:mt-10">
                  <Link
                    to="/add"
                    className="group inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-xl hero-gradient px-6 py-4 text-base font-medium text-primary-foreground shadow-rose transition-all hover:opacity-95 active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <UserPlus className="h-5 w-5" aria-hidden />
                      আমার তথ্য যোগ করি
                    </span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </Link>

                  <Link
                    to="/access"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-4 text-base font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-[hsl(var(--rose-soft))] active:scale-[0.98]"
                  >
                    <Shield className="h-5 w-5" aria-hidden />
                    আগে যোগ করেছি, দেখি
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground sm:mt-8">
          ভালোবাসা দিয়ে তৈরি 💕
        </p>
      </main>
    </div>
  );
};

export default Index;
