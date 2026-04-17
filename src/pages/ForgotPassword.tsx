import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error("ইমেইল দিন");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("রিসেট লিংক পাঠানো হয়েছে! 📧");
    } catch (err: any) {
      toast.error(err?.message || "পাঠাতে ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen warm-gradient">
      <Header />
      <main className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-sm"
        >
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full hero-gradient shadow-rose">
                <Mail className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                পাসওয়ার্ড ভুলে গেছেন?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                ইমেইল দিন, রিসেট লিংক পাঠানো হবে
              </p>
            </div>

            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-foreground">
                  ✅ <strong>{email}</strong> ঠিকানায় একটি রিসেট লিংক পাঠানো হয়েছে।
                </p>
                <p className="text-xs text-muted-foreground">
                  ইনবক্স ও Spam ফোল্ডার চেক করুন।
                </p>
                <Link to="/admin">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-1" /> লগইন পেজে ফিরুন
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary" /> ইমেইল
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="bg-card"
                  />
                </div>
                <Button
                  onClick={handleSend}
                  variant="hero"
                  className="w-full"
                  disabled={loading}
                >
                  <Send className="h-4 w-4 mr-1" />{" "}
                  {loading ? "পাঠানো হচ্ছে..." : "রিসেট লিংক পাঠান"}
                </Button>
                <Link to="/admin">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-1" /> লগইনে ফিরুন
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ForgotPassword;
