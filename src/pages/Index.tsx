import { motion } from "framer-motion";
import { ArrowRight, PlusCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { getMeSession } from "@/lib/userSession";

const Index = () => {
  const hasMe = !!getMeSession();
  return (
    <div className="flex min-h-app flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />

      <main className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-12 lg:py-10">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-2 sm:p-10 md:p-12 lg:p-12"
          >
            {/* Paper texture */}
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />

            {/* Corner ornaments */}
            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />

            <div className="relative flex flex-col items-center text-center">
              {/* Heading */}
              <h1 className="mt-10 font-display text-4xl leading-[1.1] tracking-tight text-[hsl(var(--heirloom-ink))] sm:mt-8 sm:text-5xl">
                আপনজন
              </h1>

              <div aria-hidden className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

              <p className="mt-5 max-w-md text-[15px] leading-[1.7] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px] lg:text-[18px]">
                বন্ধু, বেস্ট ফ্রেন্ড কিংবা ভালোবাসার মানুষ — আপনারা আমার জীবনের সবচেয়ে দামী অংশ। মোবাইল হারালে যেন আপনাদের হারিয়ে না ফেলি, তাই একটু কষ্ট করে নাম-নম্বরটা এখানে রেখে দেবেন? 🤍
              </p>

              {/* CTAs — three clear intents */}
              <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 sm:mt-9 md:max-w-[420px]">
                <Link
                  to="/add"
                  className="heirloom-btn-primary group relative flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300 sm:text-base"
                >
                  <PlusCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                  <span>আমার তথ্য যোগ করি</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-[18px] sm:w-[18px]" aria-hidden />
                </Link>

                <Link
                  to={hasMe ? "/me" : "/verify?next=view"}
                  className="heirloom-btn-ghost group flex w-full items-center justify-center gap-2 rounded-sm border px-5 py-3.5 text-[14px] font-medium transition-all duration-300 sm:text-[15px]"
                >
                  <ShieldCheck className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" aria-hidden />
                  <span>আমার তথ্য দেখি / এডিট করি</span>
                </Link>

              </div>

              {/* Signature */}
              <footer className="mt-10 flex flex-col items-center">
                <div aria-hidden className="h-px w-16 bg-[hsl(var(--heirloom-line))]" />
                <p className="mt-6 font-display text-base italic text-[hsl(var(--heirloom-ink-soft))] sm:text-lg">
                  ইতি, আপনারই একজন আপনজন
                </p>
              </footer>
            </div>
          </motion.article>
        </div>
      </main>

    </div>
  );
};

export default Index;
