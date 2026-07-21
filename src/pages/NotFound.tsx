import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(var(--heirloom-bg))]">
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
                <p className="mt-8 font-display text-6xl leading-none tracking-tight text-[hsl(var(--heirloom-gold-deep))] sm:mt-10 sm:text-7xl md:text-8xl">
                  404
                </p>

                <div aria-hidden className="mt-6 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

                <h1 className="mt-6 font-display text-2xl leading-[1.15] tracking-tight text-[hsl(var(--heirloom-ink))] sm:text-3xl md:text-4xl">
                  পাতাটি খুঁজে পাওয়া যায়নি
                </h1>

                <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px]">
                  আপনি যে ঠিকানাটি খুঁজছেন সেটি হয়তো সরিয়ে ফেলা হয়েছে অথবা কখনো ছিল না।
                </p>
              </div>

              <div className="mx-auto mt-10 w-full max-w-[420px] sm:mt-8">
                <Link
                  to="/"
                  className="heirloom-btn-primary flex w-full items-center justify-center gap-2 rounded-sm px-5 py-4 text-[15px] font-medium transition-all duration-300 sm:text-base"
                >
                  হোমপেজে ফিরুন
                </Link>
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
