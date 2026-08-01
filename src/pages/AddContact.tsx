import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { motion } from "framer-motion";

const AddContact = () => {
  return (
    <div className="flex min-h-app flex-col bg-heirloom-bg">
      <Header />

      <main id="main-content" className="relative flex-1 px-4 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-4 sm:p-8 md:p-10"
          >
            {/* Paper texture */}
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />

            {/* Corner ornaments */}
            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-8 w-8 sm:h-12 sm:w-12 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-8 w-8 sm:h-12 sm:w-12 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-r-2 rounded-br-sm" />

            <div className="relative">
              {/* Slim heading — no welcome hero, focus stays on the form */}
              <div className="flex flex-col items-center text-center">
                <h1 className="font-display text-[1.35rem] leading-tight tracking-tight text-heirloom-ink sm:text-2xl">
                  নতুন আপনজন যোগ করুন
                </h1>
                <div aria-hidden className="mt-2 h-px w-16 bg-gradient-to-r from-transparent via-heirloom-gold to-transparent" />
              </div>

              {/* Form */}
              <div className="mt-5 sm:mt-6">
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
