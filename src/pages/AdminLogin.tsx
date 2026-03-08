import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { adminLogin } from "@/lib/store";
import { toast } from "sonner";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (adminLogin(password)) {
      toast.success("স্বাগতম, অ্যাডমিন! 🎉");
      navigate("/admin/dashboard");
    } else {
      toast.error("পাসওয়ার্ড ভুল হয়েছে");
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
              <Button onClick={handleLogin} variant="hero" className="w-full">
                <Heart className="h-4 w-4 mr-1" /> লগইন করুন
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLogin;
