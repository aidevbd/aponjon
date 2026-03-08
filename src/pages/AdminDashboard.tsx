import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LogOut, Users, Heart, Filter, Download, Edit3, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactCard } from "@/components/ContactCard";
import { Contact, CATEGORIES, BLOOD_GROUPS } from "@/lib/types";
import { getContacts, deleteContact, updateContact, isAdminLoggedIn, adminLogout } from "@/lib/store";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin");
      return;
    }
    setContacts(getContacts());
  }, [navigate]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.note && c.note.toLowerCase().includes(search.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = filterCategory === "all" || c.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [contacts, search, filterCategory]);

  const stats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    contacts.forEach((c) => {
      categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
    });
    return { total: contacts.length, categoryCount };
  }, [contacts]);

  const handleDelete = (id: string) => {
    if (confirm("আপনি কি নিশ্চিত এই কন্টাক্ট ডিলিট করতে চান?")) {
      deleteContact(id);
      setContacts(getContacts());
      toast.success("কন্টাক্ট ডিলিট হয়েছে");
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm(contact);
  };

  const handleSaveEdit = () => {
    if (editingContact) {
      updateContact(editingContact.id, editForm);
      setContacts(getContacts());
      setEditingContact(null);
      toast.success("তথ্য আপডেট হয়েছে! 💕");
    }
  };

  const handleExportCSV = () => {
    const headers = ["নাম", "ফোন", "WhatsApp", "IMO", "ইমেইল", "ক্যাটাগরি", "ঠিকানা", "রক্তের গ্রুপ", "জন্মদিন", "নোট"];
    const rows = contacts.map((c) => [c.name, c.phone, c.whatsapp || "", c.imo || "", c.email || "", c.category, c.address || "", c.bloodGroup || "", c.birthday || "", c.note || ""]);
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

  const handleLogout = () => {
    adminLogout();
    navigate("/admin");
    toast.info("লগআউট সফল");
  };

  return (
    <div className="min-h-screen warm-gradient">
      {/* Admin Header */}
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
        {/* Stats */}
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

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="নাম, নম্বর বা কি-ওয়ার্ড দিয়ে সার্চ করুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="ফিল্টার" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contacts Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>কোনো কন্টাক্ট পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((contact, i) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={i}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
            onClick={() => setEditingContact(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" /> তথ্য সম্পাদনা
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingContact(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>নাম</Label>
                  <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card" />
                </div>
                <div className="space-y-2">
                  <Label>ফোন</Label>
                  <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-card" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={editForm.whatsapp || ""} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} className="bg-card" />
                  </div>
                  <div className="space-y-2">
                    <Label>IMO</Label>
                    <Input value={editForm.imo || ""} onChange={(e) => setEditForm({ ...editForm, imo: e.target.value })} className="bg-card" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ইমেইল</Label>
                  <Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-card" />
                </div>
                <div className="space-y-2">
                  <Label>ক্যাটাগরি</Label>
                  <Select value={editForm.category || ""} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ঠিকানা</Label>
                  <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>রক্তের গ্রুপ</Label>
                    <Select value={editForm.bloodGroup || ""} onValueChange={(v) => setEditForm({ ...editForm, bloodGroup: v })}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>জন্মদিন</Label>
                    <Input type="date" value={editForm.birthday || ""} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} className="bg-card" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>নোট</Label>
                  <Textarea value={editForm.note || ""} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="bg-card" />
                </div>
              </div>

              <Button onClick={handleSaveEdit} variant="hero" className="w-full mt-6">
                <Heart className="h-4 w-4 mr-1" /> সেভ করুন
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
