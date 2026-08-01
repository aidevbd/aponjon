import { useEffect, useId, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PhoneEntry, deriveMessengers, parseMessengersToPhones } from "@/components/PhoneWithMessengers";
import {
  updateVerifiedContact,
  updateContactViaOtpSession,
  setSecretViaSecret,
  setSecretViaOtpSession,
} from "@/lib/store";
import { getMeSession, clearMeSession, updateMeContactSnapshot } from "@/lib/userSession";
import { getChatSession, clearChatSession, createChatSession } from "@/lib/chatSession";

/** All state + handlers for the /me page. */
export function useMyInfo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(getMeSession);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [form, setForm] = useState<any>(session?.contact ?? {});
  const [phones, setPhones] = useState<PhoneEntry[]>(() =>
    session
      ? parseMessengersToPhones(
          session.contact.phone,
          session.contact.whatsapp,
          session.contact.imo,
          session.contact.telegram,
        )
      : [{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }],
  );
  const [saving, setSaving] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [settingSecret, setSettingSecret] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [ackDanger, setAckDanger] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [chatSession, setChatSession] = useState(getChatSession);
  const [openingChat, setOpeningChat] = useState(false);

  const uid = useId();
  const fid = (k: string) => `${uid}-${k}`;

  useEffect(() => {
    if (!session) navigate("/verify?next=view", { replace: true });
  }, [session, navigate]);

  const contact = session?.contact;

  const startEdit = () => {
    if (!contact) return;
    setForm(contact);
    setPhones(parseMessengersToPhones(contact.phone, contact.whatsapp, contact.imo, contact.telegram));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(contact ?? {});
  };

  const handleSave = async () => {
    if (!session || !contact) return;
    setSaving(true);
    try {
      const messengers = deriveMessengers(phones);
      const payload = {
        name: form.name,
        whatsapp: messengers.whatsapp,
        imo: messengers.imo,
        telegram: messengers.telegram,
        facebook: form.facebook,
        email: form.email,
        category: form.category,
        custom_category: form.custom_category,
        note: form.note,
        address: form.address,
        blood_group: form.blood_group,
        birthday: form.birthday,
        photo_url: form.photo_url,
      };

      if (session.auth.type === "otp") {
        const ok = await updateContactViaOtpSession(session.auth.sessionToken, payload);
        if (!ok) throw new Error("OTP_SESSION_INVALID");
      } else {
        await updateVerifiedContact(session.auth.phone, session.auth.secretCode, payload);
      }

      updateMeContactSnapshot({ ...contact, ...payload });
      setSession(getMeSession());
      setEditing(false);
      toast.success("তথ্য আপডেট হয়েছে 💕");
    } catch (err: any) {
      if (err?.message === "OTP_SESSION_INVALID") {
        toast.error("OTP সেশন শেষ হয়েছে। আবার ভেরিফাই করুন।");
        clearMeSession();
        navigate("/verify?next=edit", { replace: true });
      } else {
        toast.error("আপডেট করতে সমস্যা হয়েছে");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetSecret = async () => {
    if (!session || !contact) return;
    const s = newSecret.trim();
    if (s.length < 4) {
      toast.error("সিক্রেট কোড খুব ছোট", { description: "কমপক্ষে ৪ অক্ষরের একটি কোড দিন।" });
      return;
    }
    if (session.auth.type === "secret" && s === session.auth.secretCode) {
      toast.error("এই কোডটি ইতিমধ্যে ব্যবহৃত", { description: "নতুন একটি ভিন্ন কোড দিন।" });
      return;
    }

    setSettingSecret(true);
    const loadingId = toast.loading("সিক্রেট কোড সংরক্ষণ হচ্ছে…");
    try {
      const auth = session.auth;
      const { saveMeSession } = await import("@/lib/userSession");
      if (auth.type === "secret") {
        const ok = await setSecretViaSecret(auth.phone, auth.secretCode, s);
        if (!ok) throw new Error("FAIL");
        saveMeSession({ type: "secret", phone: auth.phone, secretCode: s }, contact);
        setSession(getMeSession());
        toast.success("সিক্রেট কোড বদলানো হয়েছে 🔐", {
          id: loadingId,
          description: "পুরনো কোডটি আর কাজ করবে না — নতুন কোডটি নিরাপদে মনে রাখুন।",
        });
      } else {
        const ok = await setSecretViaOtpSession(auth.sessionToken, s);
        if (!ok) throw new Error("FAIL");
        saveMeSession({ type: "secret", phone: contact.phone, secretCode: s }, contact);
        setSession(getMeSession());
        toast.success("সিক্রেট কোড সেট হয়েছে 🔐", {
          id: loadingId,
          description: "এখন থেকে এই কোড দিয়েই যেকোনো ডিভাইসে সাইন-ইন করা যাবে।",
        });
      }
      setNewSecret("");
      setShowSecret(false);
      setSecretOpen(false);
      setAckDanger(false);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("SECRET_TOO_SHORT")) {
        toast.error("সিক্রেট কোড খুব ছোট", { id: loadingId, description: "কমপক্ষে ৪ অক্ষরের একটি কোড দিন।" });
      } else if (msg.includes("OTP_SESSION_INVALID") || msg.includes("SESSION")) {
        toast.error("সেশন শেষ হয়ে গেছে", { id: loadingId, description: "নিরাপত্তার জন্য আবার ভেরিফাই করতে হবে।" });
      } else if (msg.includes("RATE")) {
        toast.error("অনেকবার চেষ্টা হয়েছে", { id: loadingId, description: "কিছুক্ষণ পর আবার চেষ্টা করুন।" });
      } else {
        toast.error("সিক্রেট কোড সংরক্ষণ করা যায়নি", {
          id: loadingId,
          description: "নেটওয়ার্ক পরীক্ষা করে আবার চেষ্টা করুন।",
        });
      }
    } finally {
      setSettingSecret(false);
    }
  };

  const handleLogout = () => {
    try {
      clearMeSession();
      clearChatSession();
      toast.success("সাইন-আউট হয়েছে", {
        description: "এই ডিভাইস থেকে বেরিয়ে এসেছেন। আবার আসতে ভেরিফাই করতে হবে।",
      });
      navigate("/", { replace: true });
    } catch {
      toast.error("সাইন-আউট করতে সমস্যা হয়েছে", { description: "একটু পর আবার চেষ্টা করুন।" });
    }
  };

  const startChat = async () => {
    if (!session || session.auth.type !== "secret") return;
    setOpeningChat(true);
    try {
      const cs = await createChatSession(session.auth.phone, session.auth.secretCode);
      if (cs) {
        setChatSession(cs);
        navigate("/chat");
      } else {
        toast.error("চ্যাট চালু করা যায়নি। আবার চেষ্টা করুন।");
      }
    } catch (e: any) {
      if (e?.message === "RATE_LIMITED") toast.error("অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন।");
      else toast.error("চ্যাট চালু করা যায়নি।");
    } finally {
      setOpeningChat(false);
    }
  };

  const closeSecretPanel = () => {
    setSecretOpen(false);
    setNewSecret("");
    setShowSecret(false);
    setAckDanger(false);
  };

  return {
    session,
    contact,
    editing,
    form,
    setForm,
    phones,
    setPhones,
    saving,
    fid,
    isOtpAuth: session?.auth.type === "otp",
    hasChat: !!chatSession,
    canBootstrapChat: session?.auth.type === "secret",
    openingChat,
    startEdit,
    cancelEdit,
    handleSave,
    handleLogout,
    startChat,
    // secret code
    newSecret,
    setNewSecret,
    showSecret,
    setShowSecret,
    settingSecret,
    secretOpen,
    setSecretOpen,
    closeSecretPanel,
    ackDanger,
    setAckDanger,
    handleSetSecret,
    // sessions
    sessionsOpen,
    setSessionsOpen,
  };
}
