import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Lock, KeyRound, ArrowLeft, AlertTriangle, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  verifyContactByPhone,
  verifyAndGetContact,
  generateOtp,
  startOtpEditSession,
} from "@/lib/store";
import { saveMeSession } from "@/lib/userSession";
import { createChatSession } from "@/lib/chatSession";

type NextIntent = "view" | "edit" | "chat";
type Step = "phone" | "secret" | "otp";

/**
 * Unified verify page — single auth surface for view / edit / chat.
 * URL: /verify?next=view|edit|chat
 *
 * Flow:
 *   1. User enters phone number
 *   2. If contact has secret_code → ask for it
 *      Otherwise → send OTP and ask for code
 *   3. On success:
 *      - save MeSession (for /me view + edit)
 *      - if secret auth, also try to create a ChatSession
 *      - redirect based on `next`
 */
const Verify = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = (params.get("next") as NextIntent) || "view";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  const intentLabel =
    next === "chat" ? "চ্যাট চালু করতে" :
    next === "edit" ? "তথ্য এডিট করতে" :
    "আপনার তথ্য দেখতে";

  const redirectAfterAuth = () => {
    if (next === "chat") navigate("/chat", { replace: true });
    else if (next === "edit") navigate("/me?edit=1", { replace: true });
    else navigate("/me", { replace: true });
  };

  const handlePhoneNext = async () => {
    if (!phone.trim()) {
      toast.error("ফোন নম্বর দিন");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyContactByPhone(phone.trim());
      if (!result || result.id === null) {
        if (result?.rate_limited) {
          toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন।");
          return;
        }
        toast.error("এই নম্বরে কোনো তথ্য পাওয়া যায়নি");
        return;
      }
      if (result.has_secret_code) {
        setStep("secret");
      } else {
        // No secret code — fall back to OTP
        const otpRes = await generateOtp(phone.trim());
        if (otpRes === "RATE_LIMITED") {
          toast.error("অনেকবার চেষ্টা করেছেন। পরে আবার চেষ্টা করুন।");
          return;
        }
        if (otpRes === "DAILY_LIMIT") {
          toast.error("আজকের জন্য OTP সীমা শেষ। আগামীকাল আবার চেষ্টা করুন।");
          return;
        }
        if (otpRes === "NOT_FOUND") {
          toast.error("এই নম্বরে কোনো তথ্য পাওয়া যায়নি");
          return;
        }
        if (otpRes === "SENT") {
          toast.success("OTP পাঠানো হয়েছে। ফোনে পাওয়া কোডটি দিন।");
          setStep("otp");
          return;
        }
        toast.error("OTP পাঠাতে সমস্যা হয়েছে");
      }
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleSecretVerify = async () => {
    if (!secret.trim()) {
      toast.error("সিক্রেট কোড দিন");
      return;
    }
    setLoading(true);
    try {
      const contact = await verifyAndGetContact(phone.trim(), secret.trim());
      if (!contact || contact.id === null) {
        if (contact?.rate_limited) {
          toast.error("অনেকবার চেষ্টা করেছেন। ৩০ মিনিট পর আবার চেষ্টা করুন।");
          return;
        }
        toast.error("সিক্রেট কোড ভুল হয়েছে");
        return;
      }
      // Save unified session
      saveMeSession(
        { type: "secret", phone: phone.trim(), secretCode: secret.trim() },
        contact,
      );
      // For chat intent, wait until the chat session is actually saved before redirecting.
      // Otherwise /chat can mount too early, see no session, and send the user back here.
      if (next === "chat") {
        const chatSession = await createChatSession(phone.trim(), secret.trim(), trustDevice);
        if (!chatSession) {
          toast.error("চ্যাট চালু করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
          return;
        }
      } else {
        createChatSession(phone.trim(), secret.trim(), trustDevice).catch(() => { /* non-fatal */ });
      }
      toast.success("ভেরিফিকেশন সফল! 🎉");
      redirectAfterAuth();
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!otp.trim()) {
      toast.error("OTP কোড দিন");
      return;
    }
    setLoading(true);
    try {
      const result = await startOtpEditSession(phone.trim(), otp.trim());
      if (!result.success || !result.contact || !result.session_token) {
        if (result.error === "NOT_FOUND") toast.error("তথ্য পাওয়া যায়নি");
        else toast.error("OTP কোড ভুল হয়েছে");
        return;
      }
      setOtpToken(result.session_token);
      saveMeSession(
        { type: "otp", phone: phone.trim(), sessionToken: result.session_token },
        result.contact,
      );
      toast.success("ভেরিফিকেশন সফল! 🎉");
      // OTP users can't chat (no secret code) — if intent was chat, redirect to /me with a hint
      if (next === "chat") {
        toast.info("চ্যাট চালু করতে আগে সিক্রেট কোড সেট করে নিন।");
        navigate("/me?edit=1", { replace: true });
      } else {
        redirectAfterAuth();
      }
    } catch {
      toast.error("একটি সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "phone") {
      navigate(-1);
      return;
    }
    setStep("phone");
    setSecret("");
    setOtp("");
  };

  return (
    <div className="flex min-h-app flex-col bg-heirloom-bg">
      <Header />
      <main id="main-content" className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-lg">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="heirloom-page relative overflow-hidden rounded-sm border p-6 sm:p-10"
          >
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />
            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-l-2 border-t-2 rounded-tl-sm" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 sm:h-14 sm:w-14 border-r-2 border-t-2 rounded-tr-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-l-2 rounded-bl-sm" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-r-2 rounded-br-sm" />

            <div className="relative">
              <div className="mb-8 text-center">
                <div aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-heirloom-gold/[0.5] bg-heirloom-gold/[0.08]">
                  <ShieldCheck className="h-5 w-5 text-heirloom-gold-deep" />
                </div>
                <h1 className="mt-4 font-display text-2xl leading-tight text-heirloom-ink sm:text-3xl">
                  পরিচয় যাচাই
                </h1>
                <div aria-hidden className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-heirloom-gold to-transparent" />
                <p className="mt-4 text-[14px] leading-[1.7] text-heirloom-ink-soft sm:text-[15px]">
                  {intentLabel} নিজেকে যাচাই করুন
                </p>
              </div>

              <AnimatePresence mode="wait">
                {step === "phone" && (
                  <motion.div key="phone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-heirloom-gold-deep" />
                        আপনার ফোন নম্বর
                      </Label>
                      <Input
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePhoneNext()}
                        className="bg-card"
                        inputMode="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      যে নম্বর দিয়ে তথ্য যোগ করেছিলেন সেটাই দিন। সিক্রেট কোড না থাকলে আমরা OTP পাঠাব।
                    </p>
                    <Button onClick={handlePhoneNext} variant="heirloom" className="w-full" disabled={loading}>
                      {loading ? "যাচাই হচ্ছে..." : "পরবর্তী →"}
                    </Button>
                  </motion.div>
                )}

                {step === "secret" && (
                  <motion.div key="secret" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                    <button onClick={goBack} className="inline-flex items-center gap-1 text-xs text-heirloom-ink-soft hover:text-heirloom-ink">
                      <ArrowLeft className="h-3.5 w-3.5" /> নম্বর বদলাব
                    </button>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-heirloom-gold-deep" />
                        সিক্রেট কোড
                      </Label>
                      <Input
                        type="password"
                        placeholder="আপনার গোপন কোড"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSecretVerify()}
                        className="bg-card"
                        autoFocus
                      />
                    </div>
                    <label className="flex items-start gap-2.5 rounded-sm border border-heirloom-gold/[0.3] bg-heirloom-gold/[0.05] p-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-heirloom-gold-deep accent-heirloom-gold-deep"
                      />
                      <div className="text-xs leading-relaxed">
                        <div className="font-medium text-heirloom-ink">এই ডিভাইসে ৩০ দিন মনে রাখুন</div>
                        <div className="text-heirloom-ink-soft mt-0.5">শেয়ারড বা পাবলিক ডিভাইসে চেক করবেন না।</div>
                      </div>
                    </label>
                    <Button onClick={handleSecretVerify} variant="heirloom" className="w-full" disabled={loading}>
                      {loading ? "যাচাই হচ্ছে..." : "ভেরিফাই করুন"}
                    </Button>
                  </motion.div>
                )}

                {step === "otp" && (
                  <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                    <button onClick={goBack} className="inline-flex items-center gap-1 text-xs text-heirloom-ink-soft hover:text-heirloom-ink">
                      <ArrowLeft className="h-3.5 w-3.5" /> নম্বর বদলাব
                    </button>
                    <div className="heirloom-chip rounded-sm border p-4">
                      <div className="flex gap-2 items-start">
                        <KeyRound className="h-5 w-5 text-heirloom-gold-deep shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">OTP পাঠানো হয়েছে</p>
                          <p className="text-xs text-muted-foreground mt-1">আপনার ফোনে ৬ সংখ্যার কোড পাওয়া যাবে</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-heirloom-gold-deep" />
                        OTP কোড
                      </Label>
                      <Input
                        placeholder="৬ সংখ্যার কোড"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleOtpVerify()}
                        maxLength={6}
                        className="bg-card text-center text-lg tracking-widest"
                        autoFocus
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">প্রতিদিন সর্বোচ্চ ১টি OTP। ৫ মিনিটের মধ্যে ব্যবহার করুন।</p>
                    </div>
                    <Button onClick={handleOtpVerify} variant="heirloom" className="w-full" disabled={loading}>
                      {loading ? "যাচাই হচ্ছে..." : "ভেরিফাই করুন"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default Verify;
