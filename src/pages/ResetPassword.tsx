import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase recovery link triggers a PASSWORD_RECOVERY auth event
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // Also check existing session (link may already be processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (password !== confirm) {
      toast.error("দুইটি পাসওয়ার্ড মিলছে না");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("পাসওয়ার্ড আপডেট হয়েছে! 🎉");
      await supabase.auth.signOut();
      navigate("/admin");
    } catch (err: any) {
      toast.error(err?.message || "আপডেট ব্যর্থ হয়েছে");
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
                <KeyRound className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                নতুন পাসওয়ার্ড সেট করুন
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {ready ? "নতুন পাসওয়ার্ড দিন" : "লিংক যাচাই হচ্ছে..."}
              </p>
            </div>

            {ready && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" /> নতুন পাসওয়ার্ড
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">পাসওয়ার্ড নিশ্চিত করুন</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="আবার লিখুন"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    className="bg-card"
                  />
                </div>
                <Button
                  onClick={handleReset}
                  variant="hero"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "আপডেট হচ্ছে..." : "পাসওয়ার্ড আপডেট করুন"}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPassword;
