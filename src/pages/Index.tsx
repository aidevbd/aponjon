import { motion } from "framer-motion";
import {
  Heart,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Search,
  ShieldCheck,
  Clock3,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

const trustPoints = [
  { icon: Clock3, text: "মাত্র ১ মিনিটেই শেষ" },
  { icon: ShieldCheck, text: "শুধু আপনার OTP দিয়েই অ্যাক্সেস" },
  { icon: Lock, text: "আপনার তথ্য, আপনারই নিয়ন্ত্রণে" },
];

const Index = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* Ambient background blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-[22rem] w-[22rem] rounded-full bg-[hsl(var(--coral))]/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-[20rem] w-[20rem] rounded-full bg-[hsl(var(--rose-soft))] blur-3xl"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-stretch lg:gap-10">
            {/* LEFT — The letter */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-6 shadow-rose sm:p-8 lg:p-12"
            >
              {/* Corner sparkle */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl"
              />

              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="relative inline-flex items-center gap-2 rounded-full border border-primary/20 bg-[hsl(var(--rose-soft))] px-3 py-1"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span className="text-[11px] font-medium tracking-wide text-primary sm:text-xs">
                  আসসালামু আলাইকুম 💕
                </span>
              </motion.div>

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

              <h1 className="mt-6 font-display text-[30px] leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-[46px]">
                আপনি আমার{" "}
                <span className="italic text-primary">আপনজন</span>
              </h1>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                বন্ধু, বেস্ট ফ্রেন্ড কিংবা ভালোবাসার মানুষ — আপনারা আমার
                জীবনের সবচেয়ে দামী অংশ। মোবাইল হারালে যেন আপনাদের হারিয়ে না
                ফেলি, তাই একটু কষ্ট করে নিজের নাম আর নম্বরটা এখানে রেখে
                দেবেন? 🤍
              </p>

              {/* Trust points */}
              <ul className="mt-6 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3">
                {trustPoints.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-[13px] text-foreground/80 backdrop-blur-sm sm:text-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--rose-soft))] text-primary">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              {/* Signature */}
              <div className="mt-8 flex items-center gap-3 sm:mt-10">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Aponjon
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <p className="mt-3 font-display text-base italic text-primary/85 sm:text-lg">
                ইতি, আপনারই একজন আপনজন
              </p>
            </motion.section>

            {/* RIGHT — The action card */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="relative flex flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card p-6 shadow-rose sm:p-8 lg:p-10"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--coral))]/20 blur-3xl"
              />

              <div className="relative flex flex-col">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  আজই শুরু করুন
                </p>
                <h2 className="mt-2 font-display text-xl text-foreground sm:text-2xl">
                  আপনার তথ্য যোগ করুন
                </h2>

                <div className="mt-5 flex flex-col gap-3">
                  {/* Primary CTA */}
                  <Link
                    to="/add"
                    className="cta-primary group w-full px-5 py-3.5 text-sm sm:text-base"
                  >
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                      <span className="font-semibold">আমার তথ্য যোগ করি</span>
                    </span>
                    <ArrowRight
                      className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5"
                      aria-hidden
                    />
                  </Link>
                  <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    মাত্র ১ মিনিটে নাম, নম্বর ও সোশ্যাল মিডিয়া যোগ করুন
                  </p>

                  {/* Secondary CTA */}
                  <Link
                    to="/access"
                    className="cta-secondary group w-full px-5 py-3 text-sm sm:text-base"
                  >
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <Search
                        className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 sm:h-5 sm:w-5"
                        aria-hidden
                      />
                      <span>আগে যোগ করেছি — দেখতে চাই</span>
                    </span>
                  </Link>
                  <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    আপনার OTP দিয়ে সংরক্ষিত তথ্য দেখুন ও পরিবর্তন করুন
                  </p>
                </div>

                {/* Whisper note */}
                <div className="mt-6 rounded-2xl border border-primary/15 bg-[hsl(var(--rose-soft))]/60 p-4 sm:mt-8">
                  <p className="text-[12.5px] leading-relaxed text-foreground/75 sm:text-[13px]">
                    <span className="font-display italic text-primary">
                      একটি ছোট্ট কথা —
                    </span>{" "}
                    আপনার নম্বরটা শুধুই আমার কাছে থাকবে, নিরাপদে। কেউ দেখতে
                    পাবে না, কোথাও শেয়ার হবে না।
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
