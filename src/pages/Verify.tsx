import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Lock, KeyRound, ArrowLeft, AlertTriangle, ShieldCheck, Mail, MailCheck } from "lucide-react";
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
  getContactEmailHint,
  sendEmailOtp,
  startEmailVerifiedSession,
  verifyEmailCode,
  type ContactEmailHint,
} from "@/lib/store";
import { emailAuth } from "@/lib/emailAuthClient";
import { saveMeSession } from "@/lib/userSession";
import { createChatSession } from "@/lib/chatSession";
import { swallow } from "@/lib/devLog";
import { HeirloomPageSkeleton } from "@/components/skeletons/LoadingSkeletons";

type NextIntent = "view" | "edit" | "chat";
type Step = "phone" | "secret" | "otp" | "email" | "email-sent";

/**
 * Unified verify page — single auth surface for view / edit / chat.
 * URL: /verify?next=view|edit|chat
 *
 * Flow:
 *   1. User enters phone number
 *   2. If contact has secret_code → ask for it
 *      Else if contact has an email → send a one-time link to that email
 *      Otherwise → legacy OTP step
 *   3. On success:
 *      - save MeSession (for /me view + edit)
 *      - if secret auth, also try to create a ChatSession
 *      - redirect based on `next`
 */
const Verify = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = (params.get("next") as NextIntent) || "view";
  const isEmailCallback = params.get("email") === "1";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [emailHint, setEmailHint] = useState<ContactEmailHint | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [showCodeFallback, setShowCodeFallback] = useState(false);

  const [exchanging, setExchanging] = useState(isEmailCallback);


  const intentLabel =
    next === "chat" ? "চ্যাট চালু করতে" :
    next === "edit" ? "তথ্য এডিট করতে" :
    "আপনার তথ্য দেখতে";

  const redirectAfterAuth = () => {
    if (next === "chat") navigate("/chat", { replace: true });
    else if (next === "edit") navigate("/me?edit=1", { replace: true });
    else navigate("/me", { replace: true });
  };

  /** Turn a live Supabase auth session into our 15-min verified session. */
  const finishEmailAuth = async (): Promise<boolean> => {
    const res = await startEmailVerifiedSession();
    // The auth session was only a proof of email ownership — drop it immediately.
    await emailAuth.auth.signOut().catch((e) => swallow("verify.signOut", e));
    if (!res.success || !res.contact || !res.session_token) return false;
    saveMeSession(
      { type: "otp", phone: res.contact.phone, sessionToken: res.session_token },
      res.contact,
    );
    toast.success("ইমেইল যাচাই সফল! 🎉");
    if (next === "chat") {
      toast.info("চ্যাট চালু করতে আগে সিক্রেট কোড সেট করে নিন।");
      navigate("/me", { replace: true });
    } else {
      redirectAfterAuth();
    }
    return true;
  };

  // ---- Email link callback: exchange the auth session for a 15-min edit session ----
  useEffect(() => {
    if (!isEmailCallback) return;
    let cancelled = false;

    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errCode = params.get("error_code") || hash.get("error_code") || params.get("error") || hash.get("error");

      if (errCode) {
        const expired = /expired|invalid/i.test(errCode);
        toast.error(expired ? "লিংকটির সময় শেষ" : "লিংকটি কাজ করছে না", {
          description: "ইমেইলে আসা ৬ সংখ্যার কোড দিয়ে যাচাই করুন, বা নতুন কোড নিন।",
        });
        setStep("email");
        setExchanging(false);
        return;
      }

      try {
        // 1. Implicit style (#access_token=...&refresh_token=...) — works from any browser.
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken) {
          await emailAuth.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken || accessToken })
            .catch((e) => swallow("verify.implicit", e));
        }

        // 2. PKCE style: ?code=... (only works in the browser that requested the link)
        const code = params.get("code");
        if (!accessToken && code) {
          await emailAuth.auth.exchangeCodeForSession(code).catch((e) => swallow("verify.pkce", e));
        }

        // 3. token_hash style: ?token_hash=...&type=magiclink|email|signup
        const tokenHash = params.get("token_hash") || params.get("token");
        const type = (params.get("type") || "email") as "magiclink" | "email" | "signup" | "recovery";
        if (!accessToken && !code && tokenHash) {
          await emailAuth.auth
            .verifyOtp({ token_hash: tokenHash, type })
            .catch((e) => swallow("verify.tokenHash", e));
        }

        let hasSession = false;
        for (let i = 0; i < 20; i++) {
          const { data } = await emailAuth.auth.getSession();
          if (data.session) {
            hasSession = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        if (cancelled) return;

        if (!hasSession) {
          toast.error("লিংকটি আর কাজ করছে না", {
            description: "ইমেইলে আসা ৬ সংখ্যার কোড দিয়ে যাচাই করুন, বা নতুন কোড নিন।",
          });
          setStep("email");
          setExchanging(false);
          return;
        }


        const ok = await finishEmailAuth();
        if (cancelled) return;
        if (!ok) {
          toast.error("এই ইমেইলের সাথে মিল পাওয়া যায়নি", {
            description: "আপনার তথ্যে সংরক্ষিত ইমেইল দিয়েই চেষ্টা করুন।",
          });
          setStep("email");
          setExchanging(false);
        }
      } catch (e) {
        swallow("verify.emailCallback", e);
        if (!cancelled) {
          toast.error("যাচাই করা যায়নি", { description: "আবার চেষ্টা করুন।" });
          setStep("email");
          setExchanging(false);
        }
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmailCallback]);

  const handleEmailCodeVerify = async () => {
    const addr = emailInput.trim().toLowerCase();
    const code = emailCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("৬ সংখ্যার কোডটি লিখুন");
      return;
    }
    setLoading(true);
    try {
      await verifyEmailCode(addr, code);
      const ok = await finishEmailAuth();
      if (!ok) {
        toast.error("এই ইমেইলের সাথে মিল পাওয়া যায়নি", {
          description: "আপনার তথ্যে সংরক্ষিত ইমেইল দিয়েই চেষ্টা করুন।",
        });
      }
    } catch (e: any) {
      swallow("verify.emailCode", e);
      toast.error("কোডটি মিলছে না", { description: "নতুন কোড নিয়ে আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  };


  const handleSendEmailLink = async () => {
    const addr = emailInput.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      toast.error("ইমেইল ঠিকানা ঠিকভাবে লিখুন");
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/verify?email=1&next=${next}`;
      await sendEmailOtp(addr, redirectTo);
      setStep("email-sent");
      toast.success("ইমেইলে যাচাই লিংক পাঠানো হয়েছে 💌", {
        description: "ইমেইল খুলে “Verify email” লিংকে ক্লিক করুন।",
      });

    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("rate") || msg.includes("limit")) {
        toast.error("একটু পরে আবার চেষ্টা করুন", { description: "অল্প সময়ে অনেকবার পাঠানো হয়েছে।" });
      } else if (msg.includes("invalid")) {
        toast.error("ইমেইল ঠিকানাটি গ্রহণ করা যায়নি");
      } else {
        toast.error("ইমেইল পাঠানো যায়নি", { description: "একটু পর আবার চেষ্টা করুন।" });
      }
    } finally {
      setLoading(false);
    }
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

      let hint: ContactEmailHint | null = null;
      try {
        hint = await getContactEmailHint(phone.trim());
      } catch (e) {
        swallow("verify.emailHint", e);
      }
      setEmailHint(hint);

      if (result.has_secret_code) {
        setStep("secret");
        return;
      }
      if (hint?.has_email) {
        setStep("email");
        return;
      }

      // No secret code and no email — legacy OTP step
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
        setStep("otp");
        return;
      }
      toast.error("কোড পাঠাতে সমস্যা হয়েছে");
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

  if (exchanging) {
    return (
      <div className="flex min-h-app flex-col bg-heirloom-bg">
        <Header />
        <main id="main-content" className="flex-1 px-4 py-8">
          <HeirloomPageSkeleton />
        </main>
      </div>
    );
  }

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
                      যে নম্বর দিয়ে তথ্য যোগ করেছিলেন সেটাই দিন। সিক্রেট কোড না থাকলে আপনার ইমেইলে যাচাই লিংক পাঠাব।
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
                    {emailHint?.has_email && (
                      <button
                        onClick={() => setStep("email")}
                        className="mx-auto flex items-center gap-1.5 text-xs text-heirloom-gold-deep underline-offset-4 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        সিক্রেট কোড ভুলে গেছেন? ইমেইলে যাচাই লিংক নিন
                      </button>
                    )}
                  </motion.div>
                )}

                {step === "email" && (
                  <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                    <button onClick={goBack} className="inline-flex items-center gap-1 text-xs text-heirloom-ink-soft hover:text-heirloom-ink">
                      <ArrowLeft className="h-3.5 w-3.5" /> নম্বর বদলাব
                    </button>
                    <div className="heirloom-chip rounded-sm border p-4">
                      <div className="flex items-start gap-2">
                        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-heirloom-gold-deep" />
                        <div>
                          <p className="text-sm font-medium">ইমেইলে ৬ সংখ্যার কোড পাঠাব</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            আপনার ইমেইলে একটি ৬ সংখ্যার কোড যাবে — কোডটি লিখলেই যাচাই সম্পন্ন।
                          </p>

                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-heirloom-gold-deep" />
                        আপনার ইমেইল
                      </Label>
                      <Input
                        type="email"
                        placeholder={emailHint?.masked ?? "you@example.com"}
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendEmailLink()}
                        className="bg-card"
                        inputMode="email"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        আপনার তথ্যে সংরক্ষিত ইমেইলটি লিখুন — সেটি দেখতে এমন: <span className="font-medium text-heirloom-ink">{emailHint?.masked}</span>
                      </p>
                    </div>
                    <Button onClick={handleSendEmailLink} variant="heirloom" className="w-full" disabled={loading}>
                      {loading ? "পাঠানো হচ্ছে..." : "ইমেইলে কোড পাঠান 💌"}
                    </Button>

                  </motion.div>
                )}

                {step === "email-sent" && (
                  <motion.div key="email-sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                    <div className="text-center">
                      <div aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-heirloom-gold/[0.5] bg-heirloom-gold/[0.08]">
                        <MailCheck className="h-5 w-5 text-heirloom-gold-deep" />
                      </div>
                      <p className="mt-3 font-display text-lg text-heirloom-ink">কোড পাঠানো হয়েছে</p>
                      <p className="mt-2 text-[14px] leading-[1.7] text-heirloom-ink-soft">
                        <span className="font-medium text-heirloom-ink">{emailInput}</span> — এই ইমেইলে
                        আসা ৬ সংখ্যার কোডটি নিচে লিখুন।
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        ইনবক্সে না পেলে স্প্যাম/প্রমোশন ফোল্ডারও দেখুন।
                      </p>
                    </div>

                    <div className="space-y-2 text-left">
                      <Label className="flex items-center gap-2 text-xs">
                        <KeyRound className="h-3.5 w-3.5 text-heirloom-gold-deep" />
                        ইমেইলে আসা ৬ সংখ্যার কোড
                      </Label>
                      <Input
                        placeholder="৬ সংখ্যার কোড"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={(e) => e.key === "Enter" && handleEmailCodeVerify()}
                        maxLength={6}
                        className="bg-card text-center text-lg tracking-widest"
                        inputMode="numeric"
                        autoFocus
                      />
                      <Button onClick={handleEmailCodeVerify} variant="heirloom" className="w-full" disabled={loading}>
                        {loading ? "যাচাই হচ্ছে..." : "কোড দিয়ে যাচাই করুন"}
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button onClick={handleSendEmailLink} variant="outline" className="w-full" disabled={loading}>
                        {loading ? "পাঠানো হচ্ছে..." : "নতুন কোড পাঠান"}
                      </Button>
                      <button onClick={goBack} className="mx-auto text-xs text-heirloom-ink-soft hover:text-heirloom-ink">
                        অন্য নম্বর দিয়ে চেষ্টা করব
                      </button>
                    </div>
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
