import { Header } from "@/components/Header";
import { AccessForm } from "@/components/AccessForm";
import { motion } from "framer-motion";

const AccessData = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />

      <main className="relative flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10 md:p-14 lg:p-16"
          >
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />

            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <h1 className="mt-10 font-display text-3xl leading-[1.15] tracking-tight text-[hsl(var(--heirloom-ink))] sm:mt-12 sm:text-4xl md:text-5xl">
                  আমার তথ্য
                </h1>

                <div aria-hidden className="mt-5 h-px w-28 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

                <p className="mt-5 max-w-md text-[15px] leading-[1.7] text-[hsl(var(--heirloom-ink-soft))] sm:text-base md:max-w-lg md:text-[17px] lg:text-[18px]">
                  ফোন নম্বর বা সিক্রেট কোড দিয়ে আপনার তথ্য দেখুন ও আপডেট করুন।
                </p>
              </div>

              <div className="mt-10 sm:mt-12">
                <AccessForm />
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default AccessData;
