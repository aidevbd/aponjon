import { EmbeddedAdminChat } from "@/components/EmbeddedAdminChat";

// Standalone /admin/chat route — thin wrapper around the same EmbeddedAdminChat
// component used inside the dashboard. Keeping a single source of truth ensures
// features (settings, notifications, sound, vibration, search, message actions,
// edit/reply/reactions, etc.) stay in sync across both surfaces.
const AdminChat = () => {
  return (
    <div className="min-h-dvh warm-gradient">
      <EmbeddedAdminChat />
    </div>
  );
};

export default AdminChat;
