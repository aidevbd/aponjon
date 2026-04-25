import { motion } from "framer-motion";
import { Heart, UserPlus, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen warm-gradient">
      <Header />

      {/* Hero — personal letter style */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-coral/20 blur-3xl" />
          <div className="absolute top-40 right-1/3 h-24 w-24 rounded-full bg-peach/40 blur-2xl" />
        </div>

        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full hero-gradient shadow-rose"
            >
              <Heart className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground fill-current" />
            </motion.div>

            <h1 className="mb-4 text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              আমার আপনজনদের জন্য
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              আসসালামু আলাইকুম 💕
            </p>
          </motion.div>
        </div>
      </section>

      {/* Personal letter card */}
      <section className="container mx-auto px-4 -mt-8 md:-mt-10 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto max-w-2xl glass-card p-6 md:p-8"
        >
          <div className="space-y-3 text-[15px] md:text-base leading-relaxed text-foreground/90 font-display">
            <p>
              মোবাইল হারালে যেন আপনাকে হারিয়ে না ফেলি — তাই এই ছোট্ট ডাইরেক্টরি।
            </p>
            <p>
              একটু কষ্ট করে আপনার নাম আর নম্বরটা যোগ করে দেবেন? 🤍
            </p>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link to="/add" className="flex-1">
              <Button variant="hero" size="lg" className="w-full gap-2 text-base">
                <UserPlus className="h-5 w-5" /> আমার তথ্য যোগ করি
              </Button>
            </Link>
            <Link to="/access" className="flex-1">
              <Button variant="outline" size="lg" className="w-full gap-2 text-base">
                <Shield className="h-5 w-5" /> আগে যোগ করেছি, দেখি
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            — কৃতজ্ঞতায়, আপনারই একজন আপনজন
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        <p>ভালোবাসা দিয়ে তৈরি 💕</p>
      </footer>
    </div>
  );
};

export default Index;
