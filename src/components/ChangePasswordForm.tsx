import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminActivity } from "@/lib/adminLog";

const passwordSchema = z
  .object({
    current: z.string().min(1, "বর্তমান পাসওয়ার্ড দিন"),
    next: z
      .string()
      .min(6, "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে")
      .max(72, "পাসওয়ার্ড অনেক বড়"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    path: ["confirm"],
    message: "দুইটি পাসওয়ার্ড মিলছে না",
  })
  .refine((d) => d.current !== d.next, {
    path: ["next"],
    message: "নতুন পাসওয়ার্ড পুরোনোটার মতো হতে পারবে না",
  });

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsed = passwordSchema.safeParse({ current, next, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate with current password
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email;
      if (!email) throw new Error("লগইন সেশন পাওয়া যায়নি");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInError) {
        toast.error("বর্তমান পাসওয়ার্ড সঠিক নয়");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateError) throw updateError;

      await logAdminActivity("password_change", "এডমিন পাসওয়ার্ড পরিবর্তন করেছেন");
      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! 🎉");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      toast.error(err?.message || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 max-w-md mx-auto"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full hero-gradient shadow-rose">
          <KeyRound className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-base font-display font-semibold text-foreground">
            পাসওয়ার্ড পরিবর্তন
          </h2>
          <p className="text-xs text-muted-foreground">
            নিরাপত্তার জন্য নিয়মিত পাসওয়ার্ড পরিবর্তন করুন
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="current" className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3 w-3 text-primary" /> বর্তমান পাসওয়ার্ড
          </Label>
          <Input
            id="current"
            type={show ? "text" : "password"}
            placeholder="বর্তমান পাসওয়ার্ড"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="bg-card"
            autoComplete="current-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="next" className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3 w-3 text-primary" /> নতুন পাসওয়ার্ড
          </Label>
          <Input
            id="next"
            type={show ? "text" : "password"}
            placeholder="কমপক্ষে ৬ অক্ষর"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="bg-card"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3 w-3 text-primary" /> নিশ্চিত করুন
          </Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            placeholder="আবার লিখুন"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
            className="bg-card"
            autoComplete="new-password"
          />
        </div>

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
        </button>

        <Button
          onClick={handleSubmit}
          variant="hero"
          className="w-full mt-2"
          disabled={loading}
        >
          <KeyRound className="h-4 w-4 mr-1" />
          {loading ? "আপডেট হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
        </Button>
      </div>
    </motion.div>
  );
}
