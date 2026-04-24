import { motion } from "framer-motion";
import { Heart, UserPlus, Shield, Search, MessageCircle, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen warm-gradient">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-coral/20 blur-3xl" />
          <div className="absolute top-40 right-1/3 h-24 w-24 rounded-full bg-peach/40 blur-2xl" />
        </div>

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full hero-gradient shadow-rose"
            >
              <Heart className="h-10 w-10 text-primary-foreground fill-current" />
            </motion.div>

            <h1 className="mb-4 text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
              আপনজন ডাইরেক্টরি
            </h1>

            <p className="mb-8 text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
              প্রিয়জনদের যোগাযোগের তথ্য নিরাপদে সংরক্ষণ করুন। 
              মোবাইল হারালেও, নম্বর হারাবে না — কারণ ভালোবাসার মানুষগুলো সবসময় কাছে থাকুক। 💕
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/add">
                <Button variant="hero" size="lg" className="gap-2 text-base px-8">
                  <UserPlus className="h-5 w-5" /> তথ্য যোগ করুন
                </Button>
              </Link>
              <Link to="/access">
                <Button variant="outline" size="lg" className="gap-2 text-base px-8">
                  <Shield className="h-5 w-5" /> আমার তথ্য দেখুন
                </Button>
              </Link>
              <Link to="/chat">
                <Button variant="warm" size="lg" className="gap-2 text-base px-8">
                  <MessageCircle className="h-5 w-5" /> মেসেজ করুন
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-card/70 px-5 py-4 shadow-soft backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">অ্যাপের মতো ব্যবহার করতে চান?</p>
              <p className="text-xs text-muted-foreground">মোবাইল ব্রাউজারের menu থেকে “Add to Home Screen” দিলে এটি installable app হিসেবে কাজ করবে।</p>
            </div>
            <Button variant="outline" className="gap-2 self-start sm:self-auto" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
              <Download className="h-4 w-4 text-primary" /> ইনস্টল হিন্ট দেখুন
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              icon: <UserPlus className="h-6 w-6" />,
              title: "সহজে তথ্য যোগ করুন",
              desc: "নাম, নম্বর, WhatsApp, IMO সহ সব তথ্য একবার যোগ করুন",
            },
            {
              icon: <Shield className="h-6 w-6" />,
              title: "নিরাপদ ও সুরক্ষিত",
              desc: "সিক্রেট কোড দিয়ে আপনার তথ্য সুরক্ষিত রাখুন",
            },
            {
              icon: <Search className="h-6 w-6" />,
              title: "যেকোনো সময় এক্সেস",
              desc: "যেকোনো ডিভাইস থেকে, যেকোনো সময় প্রিয়জনের নম্বর খুঁজুন",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="glass-card p-6 text-center hover:shadow-rose transition-all duration-300"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <h3 className="mb-2 font-display font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <p>তৈরি হয়েছে ভালোবাসা দিয়ে 💕 আপনজন ডাইরেক্টরি</p>
        <p className="mt-1 text-xs">iPhone: Share → Add to Home Screen, Android: browser menu → Install app</p>
      </footer>
    </div>
  );
};

export default Index;
