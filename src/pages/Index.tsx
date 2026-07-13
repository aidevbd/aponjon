import { motion } from "framer-motion";
import { Heart, UserPlus, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />

      <main className="flex flex-1 items-center justify-center px-3 py-3 sm:px-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-card shadow-rose"
        >
          <div className="flex flex-col md:flex-row">
            {/* Left visual pane */}
            <div className="relative flex w-full flex-col justify-between overflow-hidden bg-[hsl(var(--rose-soft))] p-5 sm:p-8 md:min-h-[520px] md:w-[42%] md:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl md:h-64 md:w-64"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -left-12 hidden h-64 w-64 rounded-full bg-[hsl(var(--coral))]/15 blur-3xl md:block"
              />

              <div className="relative z-10 flex items-center gap-3 md:block">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 180 }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hero-gradient shadow-rose md:mb-5 md:h-14 md:w-14"
                >
                  <Heart
                    className="h-5 w-5 fill-current text-primary-foreground md:h-6 md:w-6"
                    aria-hidden
                  />
                </motion.div>
                <h2
                  className="font-display text-4xl italic leading-none text-primary sm:text-5xl md:text-7xl"
                  aria-hidden
                >
                  আপনজন
                </h2>
              </div>

              <p className="relative z-10 mt-3 hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/80 md:mt-0 md:block">
                Personal Directory
              </p>
            </div>

            {/* Right content pane */}
            <div className="flex w-full flex-col justify-center p-5 sm:p-8 md:w-[58%] md:p-12">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="mx-auto w-full max-w-md md:mx-0"
              >
                <span className="mb-2 inline-block text-xs font-medium tracking-wide text-primary/90">
                  আসসালামু আলাইকুম 💕
                </span>

                <h1 className="mb-3 font-display text-[26px] leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  আপনি আমার <span className="italic text-primary">আপনজন</span>
                </h1>

                <p className="text-sm leading-relaxed text-foreground/85 sm:text-base">
                  মোবাইল হারালে যেন আপনাকে হারিয়ে না ফেলি — একটু কষ্ট করে আপনার নাম আর নম্বরটা যোগ করে দেবেন? 🤍
                </p>

                <div className="mt-5 flex flex-col gap-2.5 sm:mt-6">
                  <Link
                    to="/add"
                    className="group inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-xl hero-gradient px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-rose transition-all hover:opacity-95 active:scale-[0.98] sm:text-base"
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
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-[hsl(var(--rose-soft))] active:scale-[0.98] sm:text-base"
                  >
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                    আগে যোগ করেছি, দেখি
                  </Link>
                </div>

                <p className="mt-4 text-center font-display text-sm italic text-primary/70 sm:text-base md:text-left">
                  ইতি, আপনারই একজন আপনজন
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
