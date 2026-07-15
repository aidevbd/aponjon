import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Heart, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { adminLogin, getSession } from "@/lib/store";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rawNext = params.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const afterLogin = nextPath ?? "/admin/dashboard";

  useEffect(() => {
    getSession().then((session) => {
      if (session) navigate(afterLogin, { replace: true });
    });
  }, [navigate, afterLogin]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("ইমেইল এবং পাসওয়ার্ড দিন");
      return;
    }
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("স্বাগতম, অ্যাডমিন! 🎉");
      navigate(afterLogin, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "লগইন ব্যর্থ হয়েছে");
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
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-display font-semibold text-foreground">অ্যাডমিন লগইন</h1>
              <p className="text-sm text-muted-foreground mt-1">আপনজন ডাইরেক্টরি ম্যানেজমেন্ট</p>
            </div>

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
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">পাসওয়ার্ড</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="অ্যাডমিন পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="bg-card"
                />
              </div>
              <Button onClick={handleLogin} variant="hero" className="w-full" disabled={loading}>
                <Heart className="h-4 w-4 mr-1" /> {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </Button>
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLogin;
