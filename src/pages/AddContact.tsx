import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { motion } from "framer-motion";

const AddContact = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(var(--heirloom-bg))]">
      <Header />

      <main className="relative flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="mx-auto w-full max-w-2xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10 md:p-14"
          >
            {/* Paper texture */}
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />

            {/* Corner ornaments */}
            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />

            <div className="relative">
              {/* Seal + heading */}
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 180 }}
                  className="heirloom-seal-outer flex h-14 w-14 items-center justify-center rounded-full p-1 sm:h-16 sm:w-16"
                >
                  <div className="heirloom-seal-inner flex h-full w-full items-center justify-center rounded-full">
                    <span className="font-display text-xl italic sm:text-2xl">আ</span>
                  </div>
                </motion.div>

                <h1 className="mt-5 font-display text-3xl leading-[1.15] tracking-tight text-[hsl(var(--heirloom-ink))] sm:text-4xl md:text-5xl">
                  আপনজন ডাইরেক্টরিতে স্বাগতম
                </h1>

                <div aria-hidden className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />

                <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[hsl(var(--heirloom-ink-soft))] sm:text-base">
                  আপনার তথ্য রেখে যান — আমরা যত্ন করে সংরক্ষণ করব।
                </p>
              </div>

              {/* Form */}
              <div className="mt-8 sm:mt-10">
                <ContactForm />
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default AddContact;
