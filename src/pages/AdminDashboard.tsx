import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LogOut, Users, Heart, Download, Edit3, X, Cake, Gift, Plus,
  Droplets, Phone, MessageCircle, Mail, MapPin, Calendar, Lock, StickyNote,
  Globe, LayoutDashboard, UserPlus, Facebook, LayoutGrid, List, Send, Activity, Settings
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
import { ContactCard } from "@/components/ContactCard";
import { ContactListItem } from "@/components/ContactListItem";
import { ContactDetailSheet } from "@/components/ContactDetailSheet";
import { ContactFilters } from "@/components/ContactFilters";
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBloodGroup, setFilterBloodGroup] = useState("all");
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContactRow>>({});
  const [editPhones, setEditPhones] = useState<PhoneEntry[]>([{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeTab, setActiveTab] = useState("contacts");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ existingName: string; phone: string } | null>(null);
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

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.blood_group && c.blood_group.toLowerCase().includes(search.toLowerCase())) ||
        (c.note && c.note.toLowerCase().includes(search.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = filterCategory === "all" || c.category === filterCategory;
      const matchBlood = filterBloodGroup === "all" || c.blood_group === filterBloodGroup;
      return matchSearch && matchCategory && matchBlood;
    });
  }, [contacts, search, filterCategory, filterBloodGroup]);

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
    await logAdminActivity("logout", "এডমিন লগআউট করেছেন");
    await adminLogout(); navigate("/admin"); toast.info("লগআউট সফল");
  };

  if (loading) {
    return (
      <div className="min-h-screen warm-gradient flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Heart className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
          <p className="text-muted-foreground">লোড হচ্ছে...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen warm-gradient relative">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full hero-gradient shadow-rose">
              <Heart className="h-3.5 w-3.5 text-primary-foreground fill-current" />
            </div>
            <span className="text-sm font-display font-semibold text-foreground">আপনজন</span>
            <span className="love-badge text-[10px]">অ্যাডমিন</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive hover:text-destructive h-8 text-xs">
            <LogOut className="h-3.5 w-3.5" /> লগআউট
          </Button>
        </div>
      </header>

      {/* Tab-Based Content */}
      <main className="container mx-auto px-3 sm:px-4 py-3 max-w-7xl">
        <h1 className="sr-only">অ্যাডমিন ড্যাশবোর্ড</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab}>

        <TabsList className="w-full grid grid-cols-5 h-auto sm:h-10 mb-4 p-1 gap-0.5">
          <TabsTrigger value="dashboard" className="flex-col sm:flex-row gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 py-1.5 sm:py-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ড্যাশবোর্ড</span>
            <span className="sm:hidden">হোম</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex-col sm:flex-row gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 py-1.5 sm:py-1">
            <Users className="h-3.5 w-3.5" />
            <span className="inline-flex items-center gap-1">
              <span>কন্টাক্ট</span>
              <span className="text-[9px] bg-primary/10 text-primary rounded-full px-1">{stats.total}</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-col sm:flex-row gap-0.5 sm:gap-1 text-[10px] sm:text-sm relative px-1 py-1.5 sm:py-1">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>চ্যাট</span>
            {totalUnread > 0 && (
              <span className="absolute top-0.5 right-1 sm:static sm:ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-[9px] font-bold px-1">
                {totalUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex-col sm:flex-row gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 py-1.5 sm:py-1">
            <Activity className="h-3.5 w-3.5" />
            <span>লগ</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-col sm:flex-row gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 py-1.5 sm:py-1">
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
        <TabsContent value="contacts" className="space-y-3 mt-0">
          {/* Top bar: CSV + View toggle */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 shrink-0">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <div className="ml-auto flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                aria-label="লিস্ট ভিউ"
                aria-pressed={viewMode === "list"}
                className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                aria-label="গ্রিড ভিউ"
                aria-pressed={viewMode === "grid"}
                className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>

            </div>
          </div>

          {/* Filters with pill categories */}
          <ContactFilters
            search={search}
            onSearchChange={setSearch}
            filterCategory={filterCategory}
            onCategoryChange={setFilterCategory}
            filterBloodGroup={filterBloodGroup}
            onBloodGroupChange={setFilterBloodGroup}
            categoryCount={stats.categoryCount}
          />

          {/* Results Count */}
          <div className="text-xs text-muted-foreground">
            {filtered.length === contacts.length
              ? `মোট ${contacts.length} জন`
              : `${filtered.length}/${contacts.length} জন দেখাচ্ছে`}
          </div>

          {/* Contact List / Empty State */}
          {contacts.length === 0 ? (
            /* Empty state CTA - no contacts at all */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-1">কোনো কন্টাক্ট নেই</h3>
              <p className="text-sm text-muted-foreground mb-4">আপনার প্রিয়জনদের তথ্য যোগ করা শুরু করুন!</p>
              <Button variant="hero" size="lg" onClick={() => setShowAddModal(true)} className="gap-2">
                <UserPlus className="h-5 w-5" /> প্রথম কন্টাক্ট যোগ করুন
              </Button>
            </motion.div>
          ) : filtered.length === 0 ? (
            /* Filter returned nothing */
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">কোনো কন্টাক্ট পাওয়া যায়নি</p>
              <button onClick={() => { setSearch(""); setFilterCategory("all"); setFilterBloodGroup("all"); }} className="text-xs text-primary mt-2 hover:underline">
                ফিল্টার রিসেট করুন
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((contact, i) => (
                <ContactCard key={contact.id} contact={contact} index={i} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
              {filtered.map((contact, i) => (
                <ContactListItem key={contact.id} contact={contact} index={i} onClick={setSelectedContact} />
              ))}
            </div>
          )}

          {/* Contact Detail Sheet */}
          <ContactDetailSheet
            contact={selectedContact}
            open={!!selectedContact}
            onClose={() => setSelectedContact(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {/* ===== চ্যাট ট্যাব ===== */}
        <TabsContent value="chat" className="mt-0">
          <EmbeddedAdminChat onUnreadChange={(count) => setTotalUnread(count)} />
        </TabsContent>

        {/* ===== লগ ট্যাব ===== */}
        <TabsContent value="logs" className="mt-0">
          <AdminActivityLog />
        </TabsContent>

        {/* ===== সেটিংস ট্যাব ===== */}
        <TabsContent value="settings" className="mt-0">
          <ChangePasswordForm />
        </TabsContent>
     </Tabs>
      </main>


      {/* ===== Floating Add Button (FAB) ===== */}
      {activeTab === "contacts" && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full hero-gradient shadow-rose shadow-lg"
        >
          <Plus className="h-6 w-6 text-primary-foreground" />
        </motion.button>
      )}

      {/* ===== Modals ===== */}
      <AnimatePresence>
        {editingContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setEditingContact(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
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
                <div className="space-y-1.5"><Label className="text-xs">নাম</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card h-9" /></div>
                <PhoneWithMessengers phones={editPhones} onChange={setEditPhones} firstPhoneReadOnly={false} />
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5"><Facebook className="h-3 w-3 text-blue-600" /> ফেসবুক</Label>
                  <Input value={editForm.facebook || ""} onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card h-9" />
                </div>
                <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> ইমেইল</Label><Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-card h-9" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ক্যাটাগরি</Label>
                  <Select value={editForm.category || ""} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                    <SelectTrigger className="bg-card h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">ঠিকানা</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card h-9" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">রক্তের গ্রুপ</Label>
                    <Select value={editForm.blood_group || ""} onValueChange={(v) => setEditForm({ ...editForm, blood_group: v })}>
                      <SelectTrigger className="bg-card h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">জন্মদিন</Label><Input type="date" value={editForm.birthday || ""} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} className="bg-card h-9" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">নোট</Label><Textarea value={editForm.note || ""} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="bg-card min-h-[60px]" /></div>
              </div>
              <Button onClick={handleSaveEdit} variant="hero" className="w-full mt-4 h-9">
                <Heart className="h-4 w-4 mr-1" /> সেভ করুন
              </Button>
            </motion.div>
          </motion.div>
        )}

        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
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
    </div>
  );
};

export default AdminDashboard;
