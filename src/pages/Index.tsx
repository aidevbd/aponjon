import { motion } from "framer-motion";
import { Heart, UserPlus, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen warm-gradient">
      <Header />

      {/* Hero — personal letter, no box */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-coral/20 blur-3xl" />
          <div className="absolute top-40 right-1/3 h-24 w-24 rounded-full bg-peach/40 blur-2xl" />
        </div>

        <div className="container relative mx-auto px-4 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full hero-gradient shadow-rose"
            >
              <Heart className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground fill-current" />
            </motion.div>

            <p className="text-sm md:text-base text-muted-foreground mb-2">
              আসসালামু আলাইকুম 💕
            </p>

            <h1 className="mb-6 text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              আপনি আমার আপনজন
            </h1>

            <div className="space-y-3 text-base md:text-lg leading-relaxed text-foreground/90 font-display">
              <p>
                মোবাইল হারালে যেন আপনাকে হারিয়ে না ফেলি — তাই এই ছোট্ট ডাইরেক্টরি।
              </p>
              <p>
                একটু কষ্ট করে আপনার নাম আর নম্বরটা যোগ করে দেবেন? 🤍
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/add" className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="w-full sm:w-auto gap-2 text-base px-8">
                  <UserPlus className="h-5 w-5" /> আমার তথ্য যোগ করি
                </Button>
              </Link>
              <Link to="/access" className="w-full sm:w-auto">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto gap-2 text-base px-8">
                  <Shield className="h-5 w-5" /> আগে যোগ করেছি, দেখি
                </Button>
              </Link>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              — কৃতজ্ঞতায়, আপনারই একজন আপনজন
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        <p>ভালোবাসা দিয়ে তৈরি 💕</p>
      </footer>
    </div>
  );
};

export default Index;
