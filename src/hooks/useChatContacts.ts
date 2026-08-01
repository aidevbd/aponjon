import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getChatContacts,
  getMessages,
  getUnreadCounts,
  clearChatSession,
  type ChatSession,
} from "@/lib/chatSession";
import { swallow } from "@/lib/devLog";

export type ChatContact = { id: string; name: string; phone: string; photo_url: string | null };
export type ContactPreview = { preview: string; time: string | null };

interface UseChatContactsArgs {
  session: ChatSession | null;
  onSessionExpired: () => void;
}

export function useChatContacts({ session, onSessionExpired }: UseChatContactsArgs) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [contactPreviews, setContactPreviews] = useState<Record<string, ContactPreview>>({});

  const loadContacts = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getChatContacts(session.token);
      if (data.length === 0) {
        const { data: valid } = await supabase.rpc("validate_chat_session", { p_token: session.token });
        if (!valid) {
          clearChatSession();
          onSessionExpired();
          toast.error("সেশন শেষ হয়ে গেছে। আবার লগইন করুন। 🔒");
          return;
        }
      }
      setContacts(data);
      const previewEntries = await Promise.all(
        data.map(async (contact) => {
          try {
            const contactMessages = await getMessages(session.token, contact.id);
            const lastMessage = contactMessages[contactMessages.length - 1];
            return [contact.id, {
              preview: lastMessage?.content || (lastMessage?.image_url ? "ছবি পাঠানো হয়েছে" : "ট্যাপ করে মেসেজ করুন"),
              time: lastMessage?.created_at || null,
            }] as const;
          } catch (e) {
            swallow("useChatContacts.preview", e);
            return [contact.id, { preview: "ট্যাপ করে মেসেজ করুন", time: null }] as const;
          }
        }),
      );
      setContactPreviews(Object.fromEntries(previewEntries));
    } catch (err) {
      console.error("[useChatContacts.loadContacts]", err);
      toast.error("কন্টাক্ট লোড করতে সমস্যা");
    }
  }, [session, onSessionExpired]);

  const loadUnread = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getUnreadCounts(session.token);
      const map: Record<string, number> = {};
      data.forEach((d) => { map[d.sender_id] = d.unread_count; });
      setUnreadMap(map);
    } catch (e) {
      swallow("useChatContacts.loadUnread", e);
    }
  }, [session]);

  const clearUnreadFor = useCallback((contactId: string) => {
    setUnreadMap((prev) => { const n = { ...prev }; delete n[contactId]; return n; });
  }, []);

  const bumpUnreadFor = useCallback((contactId: string) => {
    setUnreadMap((prev) => ({ ...prev, [contactId]: (prev[contactId] || 0) + 1 }));
  }, []);

  const setPreviewFor = useCallback((contactId: string, preview: ContactPreview) => {
    setContactPreviews((prev) => ({ ...prev, [contactId]: preview }));
  }, []);

  const resetContacts = useCallback(() => {
    setContacts([]);
    setUnreadMap({});
    setContactPreviews({});
  }, []);

  return {
    contacts,
    unreadMap,
    contactPreviews,
    loadContacts,
    loadUnread,
    clearUnreadFor,
    bumpUnreadFor,
    setPreviewFor,
    resetContacts,
  };
}
