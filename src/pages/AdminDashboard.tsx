import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ContactDetailSheet } from "@/components/ContactDetailSheet";
import { DashboardHome } from "@/components/DashboardHome";
import { EmbeddedAdminChat } from "@/components/EmbeddedAdminChat";
import { AdminActivityLog } from "@/components/AdminActivityLog";
import { AdminDashboardSkeleton } from "@/components/skeletons/LoadingSkeletons";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTabsBar } from "@/components/admin/AdminTabsBar";
import { AdminContactsTab } from "@/components/admin/AdminContactsTab";
import { AdminSettingsTab } from "@/components/admin/AdminSettingsTab";
import { ContactAddModal } from "@/components/admin/ContactAddModal";
import { ContactEditModal } from "@/components/admin/ContactEditModal";
import { AdminConfirmDialogs } from "@/components/admin/AdminConfirmDialogs";
import type { AddContactPayload, DuplicateInfo } from "@/components/admin/adminContactTypes";

import { useAdminContacts } from "@/hooks/admin/useAdminContacts";
import { useAdminUnread } from "@/hooks/admin/useAdminUnread";
import { useAdminTabs } from "@/hooks/admin/useAdminTabs";
import { adminLogout, getSession, type ContactRow } from "@/lib/store";
import { logAdminActivity } from "@/lib/adminLog";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, setChatOpen, immersive, chatFullscreen, tabsHidden } = useAdminTabs();
  const { totalUnread, setTotalUnread, loadUnreadCount } = useAdminUnread();
  const contactsApi = useAdminContacts();
  const {
    contacts, loading, loadContacts, search, setSearch, debouncedSearch,
    filterCategory, setFilterCategory, filterBloodGroup, setFilterBloodGroup,
    filtered, resetFilters, stats, upcomingBirthdays,
    isSaving, addContact, saveEdit, removeContact, exportCSV,
  } = contactsApi;

  const [adminEmail, setAdminEmail] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<DuplicateInfo | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pendingPayload = useRef<AddContactPayload | null>(null);

  const openContactDetail = (c: ContactRow) => { setSelectedContact(c); setLastSelectedId(c.id); };

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
    return () => { subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const submitAdd = async (payload: AddContactPayload, force = false) => {
    pendingPayload.current = payload;
    const res = await addContact(payload, force);
    if (res.duplicate) { setPendingDuplicate(res.duplicate); return; }
    if (res.ok) { setShowAddModal(false); pendingPayload.current = null; }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logAdminActivity("logout", "এডমিন লগআউট করেছেন");
    await adminLogout();
    navigate("/admin");
    toast.info("লগআউট সফল");
  };

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className={`bg-heirloom-bg relative ${chatFullscreen ? "h-dvh flex flex-col overflow-hidden" : "min-h-app"}`}>
      <AdminHeader
        hidden={immersive}
        totalContacts={stats.total}
        totalUnread={totalUnread}
        upcomingBirthdayCount={upcomingBirthdays.length}
        showChatShortcut={activeTab !== "chat"}
        onOpenChat={() => setActiveTab("chat")}
      />

      <main
        id="main-content"
        className={`container mx-auto max-w-6xl ${immersive ? "px-0 py-0" : chatFullscreen ? "flex-1 min-h-0 flex flex-col px-3 sm:px-4 pt-3 pb-3" : "px-3 sm:px-4 py-4 sm:py-5"}`}
      >
        <h1 className="sr-only">অ্যাডমিন ড্যাশবোর্ড</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className={chatFullscreen ? "flex-1 min-h-0 flex flex-col" : ""}>
          <AdminTabsBar
            totalContacts={stats.total}
            totalUnread={totalUnread}
            immersive={immersive}
            chatFullscreen={chatFullscreen}
            tabsHidden={tabsHidden}
          />

          <TabsContent value="dashboard" className="mt-0">
            <DashboardHome
              stats={stats}
              totalUnread={totalUnread}
              upcomingBirthdays={upcomingBirthdays}
              onCategoryClick={(cat) => { setActiveTab("contacts"); setFilterCategory(cat); }}
              onAddContact={() => { setActiveTab("contacts"); setShowAddModal(true); }}
              onExportCSV={exportCSV}
              onOpenChat={() => setActiveTab("chat")}
              onOpenLogs={() => setActiveTab("logs")}
            />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <AdminContactsTab
              contacts={contacts}
              filtered={filtered}
              query={debouncedSearch}
              search={search}
              onSearchChange={setSearch}
              filterCategory={filterCategory}
              onCategoryChange={setFilterCategory}
              filterBloodGroup={filterBloodGroup}
              onBloodGroupChange={setFilterBloodGroup}
              categoryCount={stats.categoryCount}
              highlightedId={lastSelectedId}
              onPickContact={openContactDetail}
              onResetFilters={resetFilters}
              onAddContact={() => setShowAddModal(true)}
            />
          </TabsContent>

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

          <TabsContent value="logs" className="mt-0">
            <AdminActivityLog />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <AdminSettingsTab
              adminEmail={adminEmail}
              contactCount={contacts.length}
              onLogout={() => setShowLogoutConfirm(true)}
              onExportCSV={exportCSV}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Globally mounted so it works from any tab, e.g. the chat header */}
      <ContactDetailSheet
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onEdit={setEditingContact}
        onDelete={setPendingDeleteId}
      />

      {activeTab === "contacts" && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          aria-label="নতুন কন্টাক্ট যোগ করুন"
          style={{ bottom: "calc(var(--mobile-bottom-nav-h, 0px) + 1rem)", right: "max(1rem, env(safe-area-inset-right))" }}
          className="fixed z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-heirloom-gold/[0.5] bg-heirloom-paper text-heirloom-gold-deep shadow-heirloom-float hover:bg-heirloom-cream/[0.9] transition-colors sm:!bottom-6 sm:!right-6"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {editingContact && (
          <ContactEditModal
            contact={editingContact}
            onClose={() => setEditingContact(null)}
            onSave={async (form, phones) => {
              const ok = await saveEdit(editingContact, form, phones);
              if (ok) setEditingContact(null);
            }}
          />
        )}
        {showAddModal && (
          <ContactAddModal
            submitting={isSaving}
            onClose={() => setShowAddModal(false)}
            onSubmit={(payload) => void submitAdd(payload)}
          />
        )}
      </AnimatePresence>

      <AdminConfirmDialogs
        pendingDeleteId={pendingDeleteId}
        onCancelDelete={() => setPendingDeleteId(null)}
        onConfirmDelete={() => {
          const id = pendingDeleteId;
          setPendingDeleteId(null);
          if (id) void removeContact(id);
        }}
        pendingDuplicate={pendingDuplicate}
        onCancelDuplicate={() => setPendingDuplicate(null)}
        onConfirmDuplicate={() => {
          setPendingDuplicate(null);
          const payload = pendingPayload.current;
          if (payload) void submitAdd(payload, true);
        }}
        showLogoutConfirm={showLogoutConfirm}
        onLogoutOpenChange={setShowLogoutConfirm}
        onConfirmLogout={handleLogout}
      />
    </div>
  );
};

export default AdminDashboard;
