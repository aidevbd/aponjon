import { motion } from "framer-motion";
import { ArrowRight, PlusCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />

      <main className="relative flex flex-1 items-center justify-center px-4 py-8 pb-32 sm:px-6 sm:py-12 sm:pb-12 lg:py-16">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10 md:p-14 lg:p-16"
          >
...
              <p className="mt-5 max-w-md text-[15px] leading-[1.7] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px] lg:text-[18px]">
                বন্ধু, বেস্ট ফ্রেন্ড কিংবা ভালোবাসার মানুষ — আপনারা আমার জীবনের সবচেয়ে দামী অংশ। মোবাইল হারালে যেন আপনাদের হারিয়ে না ফেলি, তাই একটু কষ্ট করে নাম-নম্বরটা এখানে রেখে দেবেন? 🤍
              </p>

              {/* CTAs — hidden on mobile (sticky bar takes over) */}
              <div className="mx-auto mt-9 hidden w-full max-w-sm flex-col gap-3 sm:flex md:max-w-[420px]">
                <Link
                  to="/add"
                  className="heirloom-btn-primary group relative flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300 sm:text-base"
                >
                  <PlusCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                  <span>আমার তথ্য যোগ করি</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-[18px] sm:w-[18px]" aria-hidden />
                </Link>

                <Link
                  to="/access"
                  className="heirloom-btn-ghost group flex w-full items-center justify-center gap-2 rounded-sm border px-5 py-3.5 text-[14px] font-medium transition-all duration-300 sm:text-[15px]"
                >
                  <Search className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" aria-hidden />
                  <span>আগে যোগ করেছি — দেখতে চাই</span>
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

      {/* Mobile sticky CTA bar */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
        className="heirloom-sticky-bar fixed inset-x-0 bottom-0 z-40 border-t px-3 pt-3 sm:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch gap-2">
          <Link
            to="/add"
            className="heirloom-btn-primary group flex flex-[1.35] items-center justify-center gap-1.5 rounded-sm px-3 py-3 text-[13.5px] font-medium"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            <span>যোগ করি</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            to="/access"
            className="heirloom-btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-3 py-3 text-[13.5px] font-medium"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span>দেখতে চাই</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
