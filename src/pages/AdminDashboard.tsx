import { useState, useMemo, useEffect, useRef, useId } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LogOut, Users, Heart, Download, Edit3, X, Cake, Gift, Plus,
  Droplets, Phone, MessageCircle, Mail, MapPin, Calendar, Lock, StickyNote,
  Globe, LayoutDashboard, UserPlus, Facebook, Send, Activity, Settings
} from "lucide-react";
import { PhoneWithMessengers, PhoneEntry, deriveMessengers, parseMessengersToPhones } from "@/components/PhoneWithMessengers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ContactListItem } from "@/components/ContactListItem";
import { ContactDetailSheet } from "@/components/ContactDetailSheet";
import { ContactFilters } from "@/components/ContactFilters";
import { VirtualContactList } from "@/components/VirtualContactList";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { matchesFuzzy } from "@/lib/banglaSearch";

import { DashboardHome } from "@/components/DashboardHome";
import { PhotoUpload } from "@/components/PhotoUpload";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { getContacts, deleteContact, updateContact, saveContact, adminLogout, getSession, type ContactRow } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedAdminChat } from "@/components/EmbeddedAdminChat";
import { AdminActivityLog } from "@/components/AdminActivityLog";
import { logAdminActivity } from "@/lib/adminLog";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { AdminDashboardSkeleton } from "@/components/skeletons/LoadingSkeletons";
import { useIsMobile } from "@/hooks/use-mobile";

const ADMIN_TABS = ["dashboard", "contacts", "chat", "logs", "settings"] as const;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBloodGroup, setFilterBloodGroup] = useState("all");
  
  const editUid = useId();
  const addUid = useId();
  const eid = (k: string) => `${editUid}-${k}`;
  const aid = (k: string) => `${addUid}-${k}`;
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContactRow>>({});
  const [editPhones, setEditPhones] = useState<PhoneEntry[]>([{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const urlTab = searchParams.get("tab");
  const activeTab = (ADMIN_TABS as readonly string[]).includes(urlTab || "") ? (urlTab as string) : "contacts";
  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "contacts") next.delete("tab"); else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useIsMobile();
  const immersive = chatOpen && activeTab === "chat" && isMobile;
  const chatFullscreen = activeTab === "chat" && !isMobile;

  // Auto-hide the tabs bar on desktop when the user scrolls down; reveal at top.
  const [tabsHidden, setTabsHidden] = useState(false);
  useEffect(() => {
    if (isMobile || chatFullscreen) { setTabsHidden(false); return; }
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 8) setTabsHidden(false);
      else if (y > lastY + 4) setTabsHidden(true);
      else if (y < lastY - 4) setTabsHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, chatFullscreen, activeTab]);

  // Signal immersive state to the global bottom nav so it can hide
  useEffect(() => {
    if (immersive) document.body.setAttribute("data-immersive", "true");
    else document.body.removeAttribute("data-immersive");
    return () => { document.body.removeAttribute("data-immersive"); };
  }, [immersive]);

  
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const openContactDetail = (c: ContactRow) => { setSelectedContact(c); setLastSelectedId(c.id); };
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ existingName: string; phone: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const birthdayNotified = useRef(false);
  const [addForm, setAddForm] = useState({
    name: "", facebook: "", email: "",
    category: "অন্যান্য", customCategory: "", note: "", address: "",
    bloodGroup: "", birthday: "", secretCode: "", photoUrl: "",
  });
  const [addPhones, setAddPhones] = useState<PhoneEntry[]>([
    { number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false },
  ]);

  const loadUnreadCount = async () => {
    try {
      const { data } = await supabase.rpc("get_admin_unread_counts");
      const total = (data || []).reduce((sum: number, d: any) => sum + d.unread_count, 0);
      setTotalUnread(total);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session) { navigate("/admin"); return; }
      setAdminEmail(session.user?.email || "");
      await loadContacts();
      await loadUnreadCount();
      logAdminActivity("login", "এডমিন ড্যাশবোর্ডে প্রবেশ করেছেন");
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/admin");
    });

    const channel = supabase
      .channel("dashboard-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadUnreadCount())
      .subscribe();

    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [navigate]);

  const loadContacts = async () => {
    setLoading(true);
    try { setContacts(await getContacts()); }
    catch { toast.error("ডাটা লোড করতে সমস্যা হয়েছে"); }
    finally { setLoading(false); }
  };

  const debouncedSearch = useDebouncedValue(search, 150);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim();
    return contacts.filter((c) => {
      const matchSearch = !q || [
        c.name, c.phone, c.blood_group, c.note, c.address, c.email,
        c.whatsapp, c.imo, c.telegram, c.facebook, c.custom_category,
      ].some((v) => matchesFuzzy(v, q));
      const matchCategory = filterCategory === "all" || c.category === filterCategory;
      const matchBlood = filterBloodGroup === "all" || c.blood_group === filterBloodGroup;
      return matchSearch && matchCategory && matchBlood;
    });
  }, [contacts, debouncedSearch, filterCategory, filterBloodGroup]);




  const stats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    contacts.forEach((c) => { categoryCount[c.category] = (categoryCount[c.category] || 0) + 1; });
    return { total: contacts.length, categoryCount };
  }, [contacts]);

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const upcoming: { contact: ContactRow; daysUntil: number }[] = [];
    contacts.forEach((c) => {
      if (!c.birthday) return;
      const bday = new Date(c.birthday);
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) upcoming.push({ contact: c, daysUntil: diff });
    });
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contacts]);

  useEffect(() => {
    if (birthdayNotified.current || upcomingBirthdays.length === 0) return;
    birthdayNotified.current = true;
    const todayBdays = upcomingBirthdays.filter((b) => b.daysUntil === 0);
    const soonBdays = upcomingBirthdays.filter((b) => b.daysUntil > 0 && b.daysUntil <= 7);
    if (todayBdays.length > 0) {
      toast("🎂 আজ জন্মদিন!", { description: todayBdays.map((b) => b.contact.name).join(", ") });
    } else if (soonBdays.length > 0) {
      toast("🎂 আসন্ন জন্মদিন!", { description: soonBdays.map((b) => `${b.contact.name} (${b.daysUntil} দিন বাকি)`).join(", ") });
    }
  }, [upcomingBirthdays]);

  const handleAddContact = async (forceUpdate = false) => {
    if (isAddingContact) return;
    const primaryPhone = addPhones[0]?.number.trim();
    if (!addForm.name.trim() || !primaryPhone) { toast.error("নাম এবং ফোন নম্বর আবশ্যক"); return; }
    const messengers = deriveMessengers(addPhones);
    const existing = contacts.find((c) => c.phone === primaryPhone);
    if (existing && !forceUpdate) {
      setPendingDuplicate({ existingName: existing.name, phone: primaryPhone });
      return;
    }
    if (existing && forceUpdate) {
      setIsAddingContact(true);
      try {
        await updateContact(existing.id, {
          name: addForm.name, phone: primaryPhone, whatsapp: messengers.whatsapp, imo: messengers.imo,
          telegram: messengers.telegram, facebook: addForm.facebook || null, email: addForm.email || null,
          category: addForm.category || "অন্যান্য", custom_category: addForm.customCategory || null,
          note: addForm.note || null, address: addForm.address || null, blood_group: addForm.bloodGroup || null,
          birthday: addForm.birthday || null, photo_url: addForm.photoUrl || null,
        });
        toast.success("কন্টাক্ট আপডেট হয়েছে! ✅");
        resetAddForm(); await loadContacts();
      } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); }
      finally { setIsAddingContact(false); }
      return;
    }
    setIsAddingContact(true);
    try {
      // Use save_contact_with_hash RPC so secret_code is hashed & persisted (not silently discarded)
      await saveContact({
        name: addForm.name,
        phone: primaryPhone,
        whatsapp: messengers.whatsapp || undefined,
        imo: messengers.imo || undefined,
        telegram: messengers.telegram || undefined,
        facebook: addForm.facebook || undefined,
        email: addForm.email || undefined,
        category: addForm.category || "অন্যান্য",
        custom_category: addForm.customCategory || undefined,
        note: addForm.note || undefined,
        address: addForm.address || undefined,
        blood_group: addForm.bloodGroup || undefined,
        birthday: addForm.birthday || undefined,
        secret_code: addForm.secretCode || undefined,
        photo_url: addForm.photoUrl || undefined,
      });
      toast.success("নতুন কন্টাক্ট যোগ হয়েছে! 💕");
      logAdminActivity("contact_add", `নতুন কন্টাক্ট যোগ: ${addForm.name} (${primaryPhone})`, undefined, "contact", { name: addForm.name, phone: primaryPhone });
      resetAddForm(); await loadContacts();
    } catch { toast.error("সেভ করতে সমস্যা হয়েছে"); }
    finally { setIsAddingContact(false); }
  };

  const resetAddForm = () => {
    setShowAddModal(false);
    setAddForm({ name: "", facebook: "", email: "", category: "অন্যান্য", customCategory: "", note: "", address: "", bloodGroup: "", birthday: "", secretCode: "", photoUrl: "" });
    setAddPhones([{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }]);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const contact = contacts.find(c => c.id === id);
    try {
      await deleteContact(id);
      await loadContacts();
      toast.success("কন্টাক্ট ডিলিট হয়েছে");
      logAdminActivity("contact_delete", `কন্টাক্ট ডিলিট: ${contact?.name || "অজানা"} (${contact?.phone || ""})`, id, "contact", { name: contact?.name, phone: contact?.phone });
    } catch (err) {
      console.error("[delete contact]", err);
      toast.error("ডিলিট করতে সমস্যা হয়েছে");
    }
  };

  const handleEdit = (contact: ContactRow) => {
    setEditingContact(contact);
    setEditForm(contact);
    setEditPhones(parseMessengersToPhones(contact.phone, contact.whatsapp, contact.imo, contact.telegram));
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;
    try {
      const messengers = deriveMessengers(editPhones);
      await updateContact(editingContact.id, {
        name: editForm.name, phone: editForm.phone, whatsapp: messengers.whatsapp, imo: messengers.imo,
        telegram: messengers.telegram, facebook: editForm.facebook || null, email: editForm.email || null,
        category: editForm.category, custom_category: editForm.custom_category || null,
        note: editForm.note || null, address: editForm.address || null,
        blood_group: editForm.blood_group || null, birthday: editForm.birthday || null,
        photo_url: editForm.photo_url || null,
      });
      await loadContacts(); setEditingContact(null);
      toast.success("তথ্য আপডেট হয়েছে! 💕");
      logAdminActivity("contact_edit", `কন্টাক্ট এডিট: ${editForm.name} (${editForm.phone})`, editingContact.id, "contact", { name: editForm.name, phone: editForm.phone });
    } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); }
  };

  const handleExportCSV = () => {
    const headers = ["নাম", "ফোন", "WhatsApp", "IMO", "Telegram", "Facebook", "ইমেইল", "ক্যাটাগরি", "ঠিকানা", "রক্তের গ্রুপ", "জন্মদিন", "নোট"];
    const rows = contacts.map((c) => [c.name, c.phone, c.whatsapp || "", c.imo || "", c.telegram || "", c.facebook || "", c.email || "", c.category, c.address || "", c.blood_group || "", c.birthday || "", c.note || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "aponjon-contacts.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হচ্ছে...");
    logAdminActivity("export_csv", `${contacts.length} টি কন্টাক্ট CSV এক্সপোর্ট করা হয়েছে`, undefined, "export", { count: contacts.length });
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logAdminActivity("logout", "এডমিন লগআউট করেছেন");
    await adminLogout(); navigate("/admin"); toast.info("লগআউট সফল");
  };

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className={`bg-[hsl(var(--heirloom-bg))] relative ${chatFullscreen ? "h-dvh flex flex-col overflow-hidden" : "min-h-app"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 shrink-0 border-b border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.85)] backdrop-blur ${immersive ? "hidden" : ""}`}>
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.5)] bg-[hsl(var(--heirloom-gold)/0.08)]">
              <Heart className="h-3.5 w-3.5 text-[hsl(var(--heirloom-gold-deep))] fill-current" />
            </div>
            <span className="font-display text-[17px] tracking-tight text-[hsl(var(--heirloom-ink))]">আপনজন</span>
            <span className="hidden sm:inline text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--heirloom-gold-deep))] border-l border-[hsl(var(--heirloom-line))] pl-2.5 ml-0.5">
              অ্যাডমিন
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[12px] text-[hsl(var(--heirloom-ink-soft))]">
              <span>{stats.total} কন্টাক্ট</span>
              {totalUnread > 0 && (
                <>
                  <span aria-hidden className="h-3 w-px bg-[hsl(var(--heirloom-line))]" />
                  <span className="text-[hsl(var(--heirloom-gold-deep))]">{totalUnread} অপঠিত</span>
                </>
              )}
              {upcomingBirthdays.length > 0 && (
                <>
                  <span aria-hidden className="h-3 w-px bg-[hsl(var(--heirloom-line))]" />
                  <span>{upcomingBirthdays.length} আসন্ন জন্মদিন</span>
                </>
              )}
            </div>
            {activeTab !== "chat" && (
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                aria-label={totalUnread > 0 ? `চ্যাট — ${totalUnread}টি অপঠিত` : "চ্যাট খুলুন"}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-[hsl(var(--heirloom-ink))] hover:bg-[hsl(var(--heirloom-cream)/0.6)] active:scale-95 transition-transform duration-150 touch-manipulation"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <MessageCircle className="h-5 w-5" />
                {totalUnread > 0 && (
                  <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold))] px-1 text-[10px] font-semibold text-[hsl(var(--heirloom-ink))] shadow">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>



      {/* Tab-Based Content */}
      <main id="main-content" className={`container mx-auto max-w-6xl ${immersive ? "px-0 py-0" : chatFullscreen ? "flex-1 min-h-0 flex flex-col px-3 sm:px-4 pt-3 pb-3" : "px-3 sm:px-4 py-4 sm:py-5"}`}>
        <h1 className="sr-only">অ্যাডমিন ড্যাশবোর্ড</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className={chatFullscreen ? "flex-1 min-h-0 flex flex-col" : ""}>

        <TabsList
          className={`w-full hidden sm:grid grid-cols-5 h-auto p-1 gap-0.5 bg-[hsl(var(--heirloom-paper)/0.7)] border border-[hsl(var(--heirloom-line))] rounded-sm transition-transform duration-300 ${immersive ? "sm:hidden" : ""} ${chatFullscreen ? "mb-3 shrink-0" : "mb-5 sm:sticky sm:top-14 sm:z-40"} ${tabsHidden ? "sm:-translate-y-[calc(100%+3.5rem)] sm:opacity-0 sm:pointer-events-none" : ""}`}
        >


          <TabsTrigger
            value="dashboard"
            className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 text-[10px] sm:text-[13px] px-1 py-2 sm:py-1.5 rounded-sm data-[state=active]:bg-[hsl(var(--heirloom-cream)/0.8)] data-[state=active]:text-[hsl(var(--heirloom-gold-deep))] data-[state=active]:shadow-none text-[hsl(var(--heirloom-ink-soft))]"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ড্যাশবোর্ড</span>
            <span className="sm:hidden">হোম</span>
          </TabsTrigger>
          <TabsTrigger
            value="contacts"
            className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 text-[10px] sm:text-[13px] px-1 py-2 sm:py-1.5 rounded-sm data-[state=active]:bg-[hsl(var(--heirloom-cream)/0.8)] data-[state=active]:text-[hsl(var(--heirloom-gold-deep))] data-[state=active]:shadow-none text-[hsl(var(--heirloom-ink-soft))]"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="inline-flex items-center gap-1">
              <span>কন্টাক্ট</span>
              <span className="text-[10px] text-[hsl(var(--heirloom-ink-mute))]">{stats.total}</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 text-[10px] sm:text-[13px] relative px-1 py-2 sm:py-1.5 rounded-sm data-[state=active]:bg-[hsl(var(--heirloom-cream)/0.8)] data-[state=active]:text-[hsl(var(--heirloom-gold-deep))] data-[state=active]:shadow-none text-[hsl(var(--heirloom-ink-soft))]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>চ্যাট</span>
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1 sm:static sm:ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--heirloom-gold-deep))] text-[hsl(var(--heirloom-paper))] text-[9px] font-medium px-1">
                {totalUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 text-[10px] sm:text-[13px] px-1 py-2 sm:py-1.5 rounded-sm data-[state=active]:bg-[hsl(var(--heirloom-cream)/0.8)] data-[state=active]:text-[hsl(var(--heirloom-gold-deep))] data-[state=active]:shadow-none text-[hsl(var(--heirloom-ink-soft))]"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>লগ</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-col sm:flex-row gap-0.5 sm:gap-1.5 text-[10px] sm:text-[13px] px-1 py-2 sm:py-1.5 rounded-sm data-[state=active]:bg-[hsl(var(--heirloom-cream)/0.8)] data-[state=active]:text-[hsl(var(--heirloom-gold-deep))] data-[state=active]:shadow-none text-[hsl(var(--heirloom-ink-soft))]"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>সেটিংস</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== ড্যাশবোর্ড ট্যাব ===== */}
        <TabsContent value="dashboard" className="mt-0">
          <DashboardHome
            stats={stats}
            totalUnread={totalUnread}
            upcomingBirthdays={upcomingBirthdays}
            onCategoryClick={(cat) => { setActiveTab("contacts"); setFilterCategory(cat); }}
            onAddContact={() => { setActiveTab("contacts"); setShowAddModal(true); }}
            onExportCSV={handleExportCSV}
            onOpenChat={() => setActiveTab("chat")}
            onOpenLogs={() => setActiveTab("logs")}
          />
        </TabsContent>

        {/* ===== কন্টাক্ট ট্যাব ===== */}
        <TabsContent value="contacts" className="mt-0">
          <div className="mx-auto w-full max-w-2xl space-y-3 sm:space-y-4">

            {/* Filters */}
            <div className="sticky top-0 z-40 -mx-3 sm:mx-0 rounded-none sm:rounded-sm border-y sm:border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper))] px-3 py-2.5 shadow-[0_4px_12px_-8px_hsl(var(--heirloom-ink)/0.15)]">
              <ContactFilters
                search={search}
                onSearchChange={setSearch}
                filterCategory={filterCategory}
                onCategoryChange={setFilterCategory}
                filterBloodGroup={filterBloodGroup}
                onBloodGroupChange={setFilterBloodGroup}
                categoryCount={stats.categoryCount}
                contacts={contacts}
                onPickContact={openContactDetail}
                totalCount={contacts.length}
              />
            </div>

            {/* Filtered count */}
            {contacts.length > 0 && filtered.length !== contacts.length && (
              <div className="px-1 text-[12px] text-[hsl(var(--heirloom-ink-soft))]">
                <span className="text-[hsl(var(--heirloom-gold-deep))]">{filtered.length}</span>
                {" / "}{contacts.length} জন মিলেছে
              </div>
            )}

            {/* Contact List / Empty State */}
            {contacts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-16"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.08)]">
                  <Users className="h-6 w-6 text-[hsl(var(--heirloom-gold-deep))]" />
                </div>
                <div aria-hidden className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[hsl(var(--heirloom-gold))] to-transparent" />
                <h3 className="mt-5 font-display text-2xl leading-[1.15] tracking-tight text-[hsl(var(--heirloom-ink))]">
                  কোনো কন্টাক্ট নেই
                </h3>
                <p className="mt-3 max-w-sm text-[14px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))]">
                  আপনার প্রিয়জনদের তথ্য যোগ করা শুরু করুন।
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="heirloom-btn-primary mt-8 flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-[14px] font-medium transition-all duration-300"
                >
                  <UserPlus className="h-4 w-4" />
                  প্রথম কন্টাক্ট যোগ করুন
                </button>
              </motion.div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center text-center py-14">
                <Search className="h-8 w-8 text-[hsl(var(--heirloom-ink-mute))] opacity-60" />
                <p className="mt-4 text-[14px] text-[hsl(var(--heirloom-ink-soft))]">
                  কোনো কন্টাক্ট পাওয়া যায়নি
                </p>
                <button
                  onClick={() => { setSearch(""); setFilterCategory("all"); setFilterBloodGroup("all"); }}
                  className="mt-3 text-[12px] text-[hsl(var(--heirloom-gold-deep))] underline-offset-4 hover:underline"
                >
                  ফিল্টার রিসেট করুন
                </button>
              </div>
            ) : (
              <VirtualContactList
                contacts={filtered}
                query={debouncedSearch}
                highlightedId={lastSelectedId}
                onClick={openContactDetail}
              />
            )}

          </div>

        </TabsContent>

        {/* ===== চ্যাট ট্যাব ===== */}
        <TabsContent value="chat" className={`mt-0 ${chatFullscreen ? "flex-1 min-h-0 data-[state=active]:flex flex-col" : ""}`}>
          <EmbeddedAdminChat
            onUnreadChange={(count) => setTotalUnread(count)}
            onActiveChatChange={setChatOpen}
            fillHeight={chatFullscreen}
            onOpenProfile={(userId) => {
              const c = contacts.find((x) => x.id === userId);
              if (c) openContactDetail(c);
            }}
          />
        </TabsContent>


        {/* ===== লগ ট্যাব ===== */}
        <TabsContent value="logs" className="mt-0">
          <AdminActivityLog />
        </TabsContent>

        {/* ===== সেটিংস ট্যাব ===== */}
        <TabsContent value="settings" className="mt-0">
          <div className="mx-auto max-w-2xl space-y-8">
            {/* Section: Account */}
            <section>
              <div className="mb-3 px-1">
                <h2 className="font-display text-[15px] tracking-tight text-[hsl(var(--heirloom-ink))]">অ্যাকাউন্ট</h2>
                <p className="mt-0.5 text-[12px] text-[hsl(var(--heirloom-ink-soft))]">লগইন সেশন ও পরিচয়</p>
              </div>
              <div className="rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.6)] divide-y divide-[hsl(var(--heirloom-line))]">
                <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[hsl(var(--heirloom-ink))]">সাইন-ইন করা আছেন</div>
                    <div className="mt-0.5 truncate text-[12px] text-[hsl(var(--heirloom-ink-soft))]">
                      {adminEmail || "—"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[hsl(var(--heirloom-gold)/0.4)] bg-[hsl(var(--heirloom-gold)/0.08)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--heirloom-gold-deep))]">
                    অ্যাডমিন
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[hsl(var(--heirloom-ink))]">লগআউট</div>
                    <div className="mt-0.5 text-[12px] text-[hsl(var(--heirloom-ink-soft))]">এই ডিভাইস থেকে সেশন বন্ধ করুন</div>
                  </div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-[hsl(var(--heirloom-paper))] px-3 py-1.5 text-[13px] text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    লগআউট
                  </button>
                </div>
              </div>
            </section>

            {/* Section: Security */}
            <section>
              <div className="mb-3 px-1">
                <h2 className="font-display text-[15px] tracking-tight text-[hsl(var(--heirloom-ink))]">সিকিউরিটি</h2>
                <p className="mt-0.5 text-[12px] text-[hsl(var(--heirloom-ink-soft))]">পাসওয়ার্ড পরিবর্তন করুন</p>
              </div>
              <ChangePasswordForm />
            </section>

            {/* Section: Data */}
            <section>
              <div className="mb-3 px-1">
                <h2 className="font-display text-[15px] tracking-tight text-[hsl(var(--heirloom-ink))]">ডেটা</h2>
                <p className="mt-0.5 text-[12px] text-[hsl(var(--heirloom-ink-soft))]">ব্যাকআপ ও এক্সপোর্ট</p>
              </div>
              <div className="rounded-sm border border-[hsl(var(--heirloom-line))] bg-[hsl(var(--heirloom-paper)/0.6)] p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[hsl(var(--heirloom-ink))]">কন্টাক্ট CSV এক্সপোর্ট</div>
                    <p className="mt-0.5 text-[12px] leading-[1.6] text-[hsl(var(--heirloom-ink-soft))]">
                      সব কন্টাক্টের একটি CSV কপি ডাউনলোড করে নিরাপদে সংরক্ষণ করুন।
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    disabled={contacts.length === 0}
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-sm border border-[hsl(var(--heirloom-gold)/0.5)] bg-[hsl(var(--heirloom-paper))] px-4 py-2 text-[13px] text-[hsl(var(--heirloom-gold-deep))] transition-colors hover:bg-[hsl(var(--heirloom-cream)/0.6)] disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    CSV ডাউনলোড {contacts.length > 0 && <span className="text-[hsl(var(--heirloom-ink-soft))]">({contacts.length})</span>}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </TabsContent>
     </Tabs>
      </main>

      {/* Contact Detail Sheet (globally mounted so it works from any tab, e.g. chat header) */}
      <ContactDetailSheet
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />



      {/* ===== Floating Add Button (FAB) ===== */}
      {activeTab === "contacts" && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          style={{ bottom: "calc(var(--mobile-bottom-nav-h, 0px) + 1rem)", right: "max(1rem, env(safe-area-inset-right))" }}
          className="fixed z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-[hsl(var(--heirloom-gold)/0.5)] bg-[hsl(var(--heirloom-paper))] text-[hsl(var(--heirloom-gold-deep))] shadow-[0_10px_30px_-10px_hsl(var(--heirloom-gold-deep)/0.4)] hover:bg-[hsl(var(--heirloom-cream)/0.9)] transition-colors sm:!bottom-6 sm:!right-6"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      )}

      {/* ===== Modals ===== */}
      <AnimatePresence>
        {editingContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setEditingContact(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-5 w-full max-w-md md:max-w-xl lg:max-w-2xl max-h-[85dvh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-display font-semibold flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" /> তথ্য সম্পাদনা
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="সম্পাদনা বন্ধ করুন" onClick={() => setEditingContact(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <PhotoUpload value={editForm.photo_url || undefined} onChange={(url) => setEditForm({ ...editForm, photo_url: url || null })} />
                </div>
                <div className="space-y-1.5"><Label htmlFor={eid("name")} className="text-xs">নাম</Label><Input id={eid("name")} value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card h-9" /></div>
                <PhoneWithMessengers phones={editPhones} onChange={setEditPhones} firstPhoneReadOnly={false} />
                <div className="space-y-1.5">
                  <Label htmlFor={eid("facebook")} className="text-xs flex items-center gap-1.5"><Facebook className="h-3 w-3 text-blue-600" /> ফেসবুক</Label>
                  <Input id={eid("facebook")} value={editForm.facebook || ""} onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card h-9" />
                </div>
                <div className="space-y-1.5"><Label htmlFor={eid("email")} className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> ইমেইল</Label><Input id={eid("email")} type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-card h-9" /></div>
                <div className="space-y-1.5">
                  <Label htmlFor={eid("category")} className="text-xs">ক্যাটাগরি</Label>
                  <Select value={editForm.category || ""} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                    <SelectTrigger id={eid("category")} className="bg-card h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label htmlFor={eid("address")} className="text-xs">ঠিকানা</Label><Input id={eid("address")} value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card h-9" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={eid("blood")} className="text-xs">রক্তের গ্রুপ</Label>
                    <Select value={editForm.blood_group || ""} onValueChange={(v) => setEditForm({ ...editForm, blood_group: v })}>
                      <SelectTrigger id={eid("blood")} className="bg-card h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor={eid("birthday")} className="text-xs">জন্মদিন</Label><Input id={eid("birthday")} type="date" value={editForm.birthday || ""} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} className="bg-card h-9" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor={eid("note")} className="text-xs">নোট</Label><Textarea id={eid("note")} value={editForm.note || ""} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="bg-card min-h-[60px]" /></div>
              </div>
              <Button onClick={handleSaveEdit} variant="hero" className="w-full mt-4 h-9">
                <Heart className="h-4 w-4 mr-1" /> সেভ করুন
              </Button>
            </motion.div>
          </motion.div>
        )}

        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-5 w-full max-w-md md:max-w-xl lg:max-w-2xl max-h-[85dvh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-display font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> নতুন কন্টাক্ট
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="যোগ বন্ধ করুন" onClick={() => setShowAddModal(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <PhotoUpload value={addForm.photoUrl || undefined} onChange={(url) => setAddForm({ ...addForm, photoUrl: url || "" })} />
                </div>
                <div className="space-y-1.5"><Label className="text-xs">নাম *</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="পূর্ণ নাম" className="bg-card h-9" /></div>
                <PhoneWithMessengers phones={addPhones} onChange={setAddPhones} />
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5"><Facebook className="h-3 w-3 text-blue-600" /> ফেসবুক</Label>
                  <Input value={addForm.facebook || ""} onChange={(e) => setAddForm({ ...addForm, facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card h-9" />
                </div>
                <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> ইমেইল</Label><Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} type="email" className="bg-card h-9" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ক্যাটাগরি</Label>
                  <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v })}>
                    <SelectTrigger className="bg-card h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {addForm.category === "অন্যান্য" && (
                  <div className="space-y-1.5"><Label className="text-xs">কাস্টম ক্যাটাগরি</Label><Input value={addForm.customCategory} onChange={(e) => setAddForm({ ...addForm, customCategory: e.target.value })} className="bg-card h-9" /></div>
                )}
                <div className="space-y-1.5"><Label className="text-xs">ঠিকানা</Label><Input value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} className="bg-card h-9" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">রক্তের গ্রুপ</Label>
                    <Select value={addForm.bloodGroup} onValueChange={(v) => setAddForm({ ...addForm, bloodGroup: v })}>
                      <SelectTrigger className="bg-card h-9"><SelectValue placeholder="রক্তের গ্রুপ" /></SelectTrigger>
                      <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">জন্মদিন</Label><Input type="date" value={addForm.birthday} onChange={(e) => setAddForm({ ...addForm, birthday: e.target.value })} className="bg-card h-9" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">নোট</Label><Textarea value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} className="bg-card min-h-[60px]" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5"><Lock className="h-3 w-3 text-primary" /> সিক্রেট কোড (ঐচ্ছিক)</Label>
                  <Input value={addForm.secretCode} onChange={(e) => setAddForm({ ...addForm, secretCode: e.target.value })} placeholder="গোপন কোড" className="bg-card h-9" />
                </div>
              </div>
              <Button onClick={() => handleAddContact()} disabled={isAddingContact} variant="hero" className="w-full mt-4 h-9">
                <Plus className="h-4 w-4 mr-1" /> {isAddingContact ? "যোগ হচ্ছে..." : "কন্টাক্ট যোগ করুন"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>কন্টাক্ট ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই কন্টাক্ট স্থায়ীভাবে মুছে যাবে। এই কাজ ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              হ্যাঁ, ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate phone — confirm update */}
      <AlertDialog open={!!pendingDuplicate} onOpenChange={(o) => { if (!o) setPendingDuplicate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>এই নম্বর ইতিমধ্যে আছে</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDuplicate && (
                <>এই নম্বর ({pendingDuplicate.phone}) দিয়ে "{pendingDuplicate.existingName}" ইতিমধ্যে সংরক্ষিত আছে। বিদ্যমান কন্টাক্ট আপডেট করতে চান?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>না</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPendingDuplicate(null); void handleAddContact(true); }}>
              হ্যাঁ, আপডেট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout confirmation */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-center">লগআউট করবেন?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              আপনি এই ডিভাইস থেকে সাইন-আউট হয়ে যাবেন। ফিরে আসতে আবার লগইন করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              লগআউট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
