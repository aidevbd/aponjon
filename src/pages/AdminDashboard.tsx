import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LogOut, Users, Heart, Filter, Download, Edit3, X, Cake, Gift, Plus, Droplets, Phone, MessageCircle, Mail, MapPin, Calendar, Lock, StickyNote, Globe } from "lucide-react";
import { MessengerFields } from "@/components/MessengerFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactCard } from "@/components/ContactCard";
import { PhotoUpload } from "@/components/PhotoUpload";
import { CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { getContacts, deleteContact, updateContact, saveContact, adminLogout, getSession, type ContactRow } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBloodGroup, setFilterBloodGroup] = useState("all");
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContactRow>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const birthdayNotified = useRef(false);
  const [addForm, setAddForm] = useState({
    name: "", phone: "", whatsapp: "", imo: "", telegram: "", facebook: "", email: "",
    category: "অন্যান্য", customCategory: "", note: "", address: "",
    bloodGroup: "", birthday: "", secretCode: "", photoUrl: "",
  });

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
      if (!session) {
        navigate("/admin");
        return;
      }
      await loadContacts();
      await loadUnreadCount();
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/admin");
    });

    // Realtime unread updates
    const channel = supabase
      .channel("dashboard-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadUnreadCount();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [navigate]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch {
      toast.error("ডাটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        !search ||
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
    contacts.forEach((c) => {
      categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
    });
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

  // Birthday toast notification on load
  useEffect(() => {
    if (birthdayNotified.current || upcomingBirthdays.length === 0) return;
    birthdayNotified.current = true;
    const todayBdays = upcomingBirthdays.filter((b) => b.daysUntil === 0);
    const soonBdays = upcomingBirthdays.filter((b) => b.daysUntil > 0 && b.daysUntil <= 7);
    if (todayBdays.length > 0) {
      toast("🎂 আজ জন্মদিন!", {
        description: todayBdays.map((b) => b.contact.name).join(", "),
        duration: 10000,
      });
    } else if (soonBdays.length > 0) {
      toast("🎂 আসন্ন জন্মদিন!", {
        description: soonBdays.map((b) => `${b.contact.name} (${b.daysUntil} দিন বাকি)`).join(", "),
        duration: 8000,
      });
    }
  }, [upcomingBirthdays]);

  const handleAddContact = async (forceUpdate = false) => {
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast.error("নাম এবং ফোন নম্বর আবশ্যক");
      return;
    }

    // Check for existing phone number
    const existing = contacts.find((c) => c.phone === addForm.phone.trim());
    if (existing && !forceUpdate) {
      const confirmed = confirm(
        `⚠️ এই নম্বর (${addForm.phone}) দিয়ে "${existing.name}" ইতিমধ্যে আছে।\n\nআপডেট করতে চান?`
      );
      if (!confirmed) return;
      // Update existing contact
      try {
        await updateContact(existing.id, {
          name: addForm.name,
          phone: addForm.phone,
          whatsapp: addForm.whatsapp || null,
          imo: addForm.imo || null,
          telegram: addForm.telegram || null,
          facebook: addForm.facebook || null,
          email: addForm.email || null,
          category: addForm.category || "অন্যান্য",
          custom_category: addForm.customCategory || null,
          note: addForm.note || null,
          address: addForm.address || null,
          blood_group: addForm.bloodGroup || null,
          birthday: addForm.birthday || null,
          photo_url: addForm.photoUrl || null,
        });
        toast.success("কন্টাক্ট আপডেট হয়েছে! ✅");
        setShowAddModal(false);
        setAddForm({ name: "", phone: "", whatsapp: "", imo: "", telegram: "", facebook: "", email: "", category: "অন্যান্য", customCategory: "", note: "", address: "", bloodGroup: "", birthday: "", secretCode: "", photoUrl: "" });
        await loadContacts();
      } catch {
        toast.error("আপডেট করতে সমস্যা হয়েছে");
      }
      return;
    }

    try {
      // Admin adds → directly insert with added_by = 'admin'
      const { error } = await supabase.from("contacts").insert({
        name: addForm.name,
        phone: addForm.phone,
        whatsapp: addForm.whatsapp || null,
        imo: addForm.imo || null,
        telegram: addForm.telegram || null,
        facebook: addForm.facebook || null,
        email: addForm.email || null,
        category: addForm.category || "অন্যান্য",
        custom_category: addForm.customCategory || null,
        note: addForm.note || null,
        address: addForm.address || null,
        blood_group: addForm.bloodGroup || null,
        birthday: addForm.birthday || null,
        photo_url: addForm.photoUrl || null,
        added_by: "admin",
      });
      if (error) throw error;
      toast.success("নতুন কন্টাক্ট যোগ হয়েছে! 💕");
      setShowAddModal(false);
      setAddForm({ name: "", phone: "", whatsapp: "", imo: "", telegram: "", facebook: "", email: "", category: "অন্যান্য", customCategory: "", note: "", address: "", bloodGroup: "", birthday: "", secretCode: "", photoUrl: "" });
      await loadContacts();
    } catch (err: any) {
      toast.error("সেভ করতে সমস্যা হয়েছে");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("আপনি কি নিশ্চিত এই কন্টাক্ট ডিলিট করতে চান?")) {
      try {
        await deleteContact(id);
        await loadContacts();
        toast.success("কন্টাক্ট ডিলিট হয়েছে");
      } catch {
        toast.error("ডিলিট করতে সমস্যা হয়েছে");
      }
    }
  };

  const handleEdit = (contact: ContactRow) => {
    setEditingContact(contact);
    setEditForm(contact);
  };

  const handleSaveEdit = async () => {
    if (editingContact) {
      try {
        await updateContact(editingContact.id, editForm);
        await loadContacts();
        setEditingContact(null);
        toast.success("তথ্য আপডেট হয়েছে! 💕");
      } catch {
        toast.error("আপডেট করতে সমস্যা হয়েছে");
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ["নাম", "ফোন", "WhatsApp", "IMO", "ইমেইল", "ক্যাটাগরি", "ঠিকানা", "রক্তের গ্রুপ", "জন্মদিন", "নোট"];
    const rows = contacts.map((c) => [c.name, c.phone, c.whatsapp || "", c.imo || "", c.email || "", c.category, c.address || "", c.blood_group || "", c.birthday || "", c.note || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aponjon-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হচ্ছে...");
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin");
    toast.info("লগআউট সফল");
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
    <div className="min-h-screen warm-gradient">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full hero-gradient shadow-rose">
              <Heart className="h-4 w-4 text-primary-foreground fill-current" />
            </div>
            <div>
              <span className="text-lg font-display font-semibold text-foreground">আপনজন</span>
              <span className="ml-2 love-badge">অ্যাডমিন</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/chat")} className="gap-1.5 relative">
              <MessageCircle className="h-4 w-4" /> চ্যাট
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full hero-gradient text-primary-foreground text-[9px] font-bold px-1">
                  {totalUnread}
                </span>
              )}
            </Button>
            <Button variant="hero" size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> যোগ করুন
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" /> লগআউট
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">মোট কন্টাক্ট</div>
          </div>
          {Object.entries(stats.categoryCount).slice(0, 3).map(([cat, count]) => {
            const catInfo = CATEGORIES.find((c) => c.value === cat);
            return (
              <div key={cat} className="glass-card p-4 text-center">
                <div className="text-lg mb-1">{catInfo?.icon || "✨"}</div>
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground">{cat}</div>
              </div>
            );
          })}
        </div>

        {/* Birthday Reminders */}
        {upcomingBirthdays.length > 0 && (
          <div className="mb-6 glass-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Cake className="h-4 w-4 text-primary" /> আসন্ন জন্মদিন 🎂
            </h3>
            <div className="flex flex-wrap gap-2">
              {upcomingBirthdays.map(({ contact, daysUntil }) => (
                <div key={contact.id} className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">{contact.name}</span>
                  <span className="text-muted-foreground">
                    {daysUntil === 0 ? "🎉 আজ!" : `${daysUntil} দিন বাকি`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম, নম্বর বা কি-ওয়ার্ড দিয়ে সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="ফিল্টার" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
              {CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterBloodGroup} onValueChange={setFilterBloodGroup}>
            <SelectTrigger className="w-full sm:w-40 bg-card">
              <Droplets className="h-4 w-4 mr-2" />
              <SelectValue placeholder="রক্তের গ্রুপ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব রক্তের গ্রুপ</SelectItem>
              {BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>কোনো কন্টাক্ট পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((contact, i) => (
              <ContactCard key={contact.id} contact={contact} index={i} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {editingContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setEditingContact(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" /> তথ্য সম্পাদনা
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingContact(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <PhotoUpload value={editForm.photo_url || undefined} onChange={(url) => setEditForm({ ...editForm, photo_url: url || null })} />
                </div>
                <div className="space-y-2"><Label>নাম</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card" /></div>
                <div className="space-y-2"><Label>ফোন</Label><Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-card" /></div>
                <MessengerFields
                  phone={editForm.phone || ""}
                  whatsapp={editForm.whatsapp || ""}
                  imo={editForm.imo || ""}
                  telegram={editForm.telegram || ""}
                  onChange={(field, value) => setEditForm({ ...editForm, [field]: value })}
                />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-blue-600" /> ফেসবুক</Label>
                  <Input value={editForm.facebook || ""} onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card" />
                </div>
                <div className="space-y-2"><Label>ইমেইল</Label><Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-card" /></div>
                <div className="space-y-2">
                  <Label>ক্যাটাগরি</Label>
                  <Select value={editForm.category || ""} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>ঠিকানা</Label><Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>রক্তের গ্রুপ</Label>
                    <Select value={editForm.blood_group || ""} onValueChange={(v) => setEditForm({ ...editForm, blood_group: v })}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>জন্মদিন</Label><Input type="date" value={editForm.birthday || ""} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} className="bg-card" /></div>
                </div>
                <div className="space-y-2"><Label>নোট</Label><Textarea value={editForm.note || ""} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="bg-card" /></div>
              </div>
              <Button onClick={handleSaveEdit} variant="hero" className="w-full mt-6">
                <Heart className="h-4 w-4 mr-1" /> সেভ করুন
              </Button>
            </motion.div>
          </motion.div>
        )}

        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> নতুন কন্টাক্ট যোগ করুন
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <PhotoUpload value={addForm.photoUrl || undefined} onChange={(url) => setAddForm({ ...addForm, photoUrl: url || "" })} />
                </div>
                <div className="space-y-2"><Label>নাম *</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="পূর্ণ নাম" className="bg-card" /></div>
                <div className="space-y-2"><Label>ফোন *</Label><Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="01XXXXXXXXX" className="bg-card" /></div>
                <MessengerFields
                  phone={addForm.phone}
                  whatsapp={addForm.whatsapp}
                  imo={addForm.imo}
                  telegram={addForm.telegram}
                  onChange={(field, value) => setAddForm({ ...addForm, [field]: value })}
                />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-blue-600" /> ফেসবুক</Label>
                  <Input value={addForm.facebook || ""} onChange={(e) => setAddForm({ ...addForm, facebook: e.target.value })} placeholder="লিংক বা ইউজারনেম" className="bg-card" />
                </div>
                <div className="space-y-2"><Label>ইমেইল</Label><Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} type="email" className="bg-card" /></div>
                <div className="space-y-2">
                  <Label>ক্যাটাগরি</Label>
                  <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {addForm.category === "অন্যান্য" && (
                  <div className="space-y-2"><Label>কাস্টম ক্যাটাগরি</Label><Input value={addForm.customCategory} onChange={(e) => setAddForm({ ...addForm, customCategory: e.target.value })} className="bg-card" /></div>
                )}
                <div className="space-y-2"><Label>ঠিকানা</Label><Input value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} className="bg-card" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>রক্তের গ্রুপ</Label>
                    <Select value={addForm.bloodGroup} onValueChange={(v) => setAddForm({ ...addForm, bloodGroup: v })}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="রক্তের গ্রুপ" /></SelectTrigger>
                      <SelectContent>{BLOOD_GROUPS.map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>জন্মদিন</Label><Input type="date" value={addForm.birthday} onChange={(e) => setAddForm({ ...addForm, birthday: e.target.value })} className="bg-card" /></div>
                </div>
                <div className="space-y-2"><Label>নোট</Label><Textarea value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} className="bg-card" /></div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-primary" /> সিক্রেট কোড (ঐচ্ছিক)</Label>
                  <Input value={addForm.secretCode} onChange={(e) => setAddForm({ ...addForm, secretCode: e.target.value })} placeholder="গোপন কোড" className="bg-card" />
                </div>
              </div>
              <Button onClick={() => handleAddContact()} variant="hero" className="w-full mt-6">
                <Plus className="h-4 w-4 mr-1" /> কন্টাক্ট যোগ করুন
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
